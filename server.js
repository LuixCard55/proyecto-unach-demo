const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const nodemailer = require('nodemailer');
const path = require('path');
// Evitar problemas de IPv6 en algunos entornos (como Railway)
const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");
const app = express();
// Puerto de escucha (usa variable de entorno o 3000)
const PORT = process.env.PORT || 3000;

// --- 1. CONFIGURACIÓN "TODO TERRENO" ---
// Esto permite que el servidor encuentre tus HTML donde sea que estén (en 'public' o en la raíz)
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));      // Busca en carpeta public
app.use(express.static(__dirname));     // Busca en la carpeta raíz (DONDE ESTÁS AHORA)

// Evitar que se apague el servidor por errores
process.on('uncaughtException', (err) => {
    console.log('⚠️ Alerta: Ocurrió un error, pero el servidor sigue vivo.');
    console.error(err);
});

// --- 2. BASE DE DATOS ---
// En producción, Railway proporciona la URL de conexión a través de una variable de entorno (DATABASE_URL o MYSQL_URL).
const mysqlUrl =
  process.env.MYSQL_URL ||
  process.env.MYSQL_PUBLIC_URL ||
  process.env.DATABASE_URL;

console.log("MYSQL_URL set?", Boolean(mysqlUrl));

const db = mysqlUrl
  ? mysql.createConnection(mysqlUrl)
  : mysql.createConnection({
      host: process.env.MYSQLHOST,
      user: process.env.MYSQLUSER,
      password: process.env.MYSQLPASSWORD,
      database: process.env.MYSQLDATABASE,
      port: Number(process.env.MYSQLPORT) || 3306
    });
// CONFIGURACIÓN PARA XAMPP (LOCALHOST)
/*const db = mysql.createConnection({
  host: 'localhost', user: 'root', password: '', database: 'unach_sgiaa'
});*/
db.connect(err => {
    if (err) console.error('❌ Error Base de Datos (¿Prendiste XAMPP?):', err.message);
    else console.log('✅ Base de Datos Conectada');
});

// --- 3. CARPETA DE SUBIDAS ---
const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

// --- 4. CORREO (PON TUS DATOS AQUÍ) ---
// Para producción, es mejor usar variables de entorno para el correo también, así no expones tu contraseña en el código.
// Asegúrate de crear un "App Password" en tu cuenta de Gmail si usas autenticación de dos factores, y usa ese password aquí.
// EJEMPLO DE VARIABLES DE ENTORNO PARA CORREO:
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // 587 = STARTTLS (no secure directo)
  auth: {
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

// ================= RUTAS =================

// LOGIN (Admite Admin siempre, verifica a los demás)
app.post('/api/login', (req, res) => {
    const { correo, password } = req.body;
    const sql = 'SELECT * FROM usuarios WHERE correo = ? AND password = ?';
    db.query(sql, [correo, password], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.length > 0) {
            const u = result[0];
            // Si es admin, pasa. Si no, revisamos verificación.
            if (u.rol !== 'admin' && u.es_verificado === 0) {
                return res.status(401).json({ mensaje: 'Cuenta no verificada. Revisa tu correo.' });
            }
            res.json({ mensaje: 'Login exitoso', usuario: u });
        } else {
            res.status(401).json({ mensaje: 'Credenciales incorrectas' });
        }
    });
});

// REGISTRO
// ... (resto del código de configuración e imports) ...

// REGISTRO (SIN RESTRICCIONES DE DOMINIO)
app.post('/api/usuarios', (req, res) => {
  const { nombre, correo, password, rol } = req.body;

  if (!nombre || !correo || !password || !rol) {
    return res.status(400).json({ mensaje: "Faltan datos obligatorios" });
  }

  const codigo = Math.floor(100000 + Math.random() * 900000).toString();

  const sql = `
    INSERT INTO usuarios (nombre, correo, password, rol, codigo_verificacion, es_verificado)
    VALUES (?, ?, ?, ?, ?, 0)
  `;

  db.query(sql, [nombre, correo, password, rol, codigo], async (err, result) => {
    if (err) {
      console.log("❌ Error en registro:", err.code, err.message);
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ mensaje: "Este correo ya está registrado" });
      }
      return res.status(500).json({ mensaje: "Error en base de datos", detalle: err.message });
    }

    console.log("✅ Usuario insertado:", correo);
    console.log("📌 Código de verificación:", codigo);

    // Intentar enviar correo (si falla, igual registras y respondes)
    try {
      await transporter.sendMail({
        from: `"Sistema SGIAA" <${process.env.EMAIL_USER}>`,
        to: correo,
        subject: 'Código de Verificación',
        html: `<h3>Tu código es: <b style="color:#002a50;">${codigo}</b></h3>`
      });
      console.log("📧 Correo enviado exitosamente a:", correo);
    } catch (e) {
      console.log("📧 No se pudo enviar correo:", e.message);
      console.log("📌 Pero el usuario se registró. Código:", codigo);
    }

    return res.status(200).json({ mensaje: "Usuario creado. Revisa tu correo para verificar." });
  });
});

// ... (resto del código del servidor: login, verificar, etc.) ...

// VERIFICAR
app.post('/api/verificar', (req, res) => {
    const { correo, codigo } = req.body;
    console.log("🔐 Intentando verificar:", { correo, codigo });
    
    db.query("SELECT * FROM usuarios WHERE correo = ? AND codigo_verificacion = ?", [correo, codigo], (err, r) => {
        if (err) {
            console.log("❌ Error en verificación:", err.message);
            return res.status(500).json({ mensaje: "Error al verificar" });
        }
        
        if (r.length === 0) {
            console.log("❌ Código incorrecto para:", correo);
            return res.status(400).json({ mensaje: "Código incorrecto" });
        }
        
        console.log("✅ Código correcto, actualizando usuario:", correo);
        db.query("UPDATE usuarios SET es_verificado = 1 WHERE correo = ?", [correo], (err2) => {
            if (err2) {
                console.log("❌ Error al actualizar:", err2.message);
                return res.status(500).json({ mensaje: "Error al verificar cuenta" });
            }
            console.log("✅ Usuario verificado:", correo);
            res.status(200).json({ mensaje: "OK" });
        });
    });
});

// OBTENER USUARIOS (FILTRADO INTELIGENTE LUEGO EN HTML)
app.get('/api/usuarios', (req, res) => {
    db.query("SELECT * FROM usuarios", (err, r) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(r);
    });
});
app.get('/api/usuarios/:id', (req, res) => {
    db.query("SELECT * FROM usuarios WHERE id = ?", [req.params.id], (err, r) => res.json(r[0] || {}));
});
app.delete('/api/usuarios/:id', (req, res) => {
    db.query("DELETE FROM usuarios WHERE id = ?", [req.params.id], () => res.json({ mensaje: "Eliminado" }));
});

// MATERIAS
app.get('/api/materias', (req, res) => {
    db.query("SELECT * FROM materias", (err, r) => res.json(r || []));
});
app.post('/api/materias', (req, res) => {
    const { nombre, codigo, semestre } = req.body;
    db.query("INSERT INTO materias (nombre, codigo, semestre) VALUES (?, ?, ?)", [nombre, codigo, semestre], 
    () => res.json({ mensaje: "Creada" }));
});
app.delete('/api/materias/:id', (req, res) => {
    db.query("DELETE FROM materias WHERE id = ?", [req.params.id], () => res.json({ mensaje: "Eliminada" }));
});

// REPOSITORIO (CON JOIN SEGURO)
app.get('/api/repositorio', (req, res) => {
    const sql = `SELECT r.id, r.titulo, r.nombre_archivo, r.fecha_subida, IFNULL(u.nombre, 'Desconocido') as autor 
                 FROM repositorio r LEFT JOIN usuarios u ON r.usuario_id = u.id ORDER BY r.id DESC`;
    db.query(sql, (err, r) => res.json(r || []));
});
app.post('/api/repositorio', upload.single('archivo'), (req, res) => {
    if(!req.file) return res.status(400).json({error: "Falta archivo"});
    db.query("INSERT INTO repositorio (titulo, nombre_archivo, usuario_id) VALUES (?, ?, ?)", 
    [req.body.titulo, req.file.filename, req.body.usuario_id], () => res.json({mensaje:"Subido"}));
});
app.delete('/api/repositorio/:id', (req, res) => {
    db.query("SELECT nombre_archivo FROM repositorio WHERE id=?", [req.params.id], (err, r) => {
        if(r && r.length > 0) {
            try { fs.unlinkSync(path.join(uploadDir, r[0].nombre_archivo)); } catch(e){}
        }
        db.query("DELETE FROM repositorio WHERE id=?", [req.params.id], () => res.json({mensaje:"Eliminado"}));
    });
});

// STATS
app.get('/api/stats', (req, res) => {
    db.query("SELECT rol, COUNT(*) as total FROM usuarios GROUP BY rol", (err, r) => {
        let stats = { admin:0, docente:0, estudiante:0 };
        if(r) r.forEach(row => stats[row.rol] = row.total);
        res.json(stats);
    });
});
//Se cambio de este modo al listen porque en producción (Railway) no se puede usar un puerto fijo como el 3000, sino que se debe usar el que asigna la plataforma a través de la variable de entorno PORT. De esta forma, el servidor funcionará tanto en desarrollo (usando el puerto 3000) como en producción (usando el puerto asignado por Railway).
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

process.on('unhandledRejection', (err) => {
  console.error('⚠️ unhandledRejection:', err);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Servidor listo en puerto ${PORT}`);
});