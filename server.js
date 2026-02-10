const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const crypto = require('crypto');
const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);
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
app.use(express.static(path.join(__dirname, 'public')));      // Busca en carpeta public con ruta absoluta
//app.use(express.static(__dirname));     // Busca en la carpeta raíz (DONDE ESTÁS AHORA)

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

// ================= RUTAS =================

// Ruta raíz que redirige a login.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// LOGIN (Admite Admin siempre, verifica a los demás)
app.post('/api/login', (req, res) => {
    const { correo, password } = req.body;
    
    // Validar que los campos no estén vacíos
    if (!correo || !password) {
        return res.status(400).json({ error: "Correo y contraseña son obligatorios" });
    }

    // Trimear y convertir a minúsculas para consistencia
    const correoNormalizado = correo.trim().toLowerCase();
    const passwordTrimmed = password.trim();

    const sql = 'SELECT * FROM usuarios WHERE LOWER(correo) = ? AND password = ?';
    db.query(sql, [correoNormalizado, passwordTrimmed], (err, result) => {
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

  // Validar campos obligatorios
  if (!nombre || !correo || !password || !rol) {
    return res.status(400).json({ mensaje: "Faltan datos obligatorios" });
  }

  // Trimear y normalizar datos
  const nombreTrimmed = nombre.trim();
  const correoNormalizado = correo.trim().toLowerCase();
  const passwordTrimmed = password.trim();

  // Validar longitud del nombre
  if (nombreTrimmed.length < 3 || nombreTrimmed.length > 255) {
    return res.status(400).json({ mensaje: "El nombre debe tener entre 3 y 255 caracteres" });
  }

  // Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(correoNormalizado)) {
    return res.status(400).json({ mensaje: "Por favor, ingresa un correo electrónico válido (ej: usuario@gmail.com)" });
  }

  // Validar longitud del email
  if (correoNormalizado.length > 254) {
    return res.status(400).json({ mensaje: "El correo es demasiado largo" });
  }

  // Validar longitud de contraseña
  if (passwordTrimmed.length < 6 || passwordTrimmed.length > 255) {
    return res.status(400).json({ mensaje: "La contraseña debe tener entre 6 y 255 caracteres" });
  }

  const codigo = Math.floor(100000 + Math.random() * 900000).toString();

  const sql = `
    INSERT INTO usuarios (nombre, correo, password, rol, codigo_verificacion, es_verificado)
    VALUES (?, ?, ?, ?, ?, 0)
  `;

  db.query(sql, [nombreTrimmed, correoNormalizado, passwordTrimmed, rol, codigo], async (err) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ mensaje: "Este correo ya está registrado" });
      }
      return res.status(500).json({ mensaje: "Error en base de datos", detalle: err.message });
    }

    try {
      // ✅ ENVÍO CON RESEND (INTERMEDIARIO)
      const emailHtml = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Código de Verificación - SGIAA UNACH</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);">
          <div style="max-width: 600px; margin: 30px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
            <!-- Header con color UNACH -->
            <div style="background: linear-gradient(135deg, #002a50 0%, #004d7a 100%); padding: 40px 20px; text-align: center;">
              <img src="https://www.unach.edu.ec/wp-content/uploads/2021/03/logo_unach_2021-02.png" alt="Logo UNACH" style="max-width: 180px; height: auto; margin-bottom: 15px;">
              <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">SGIAA - Sistema de Gestión Académica</h1>
              <p style="color: #b8d4f1; margin: 10px 0 0 0; font-size: 14px;">Universidad Nacional de Chimborazo</p>
            </div>

            <!-- Contenido principal -->
            <div style="padding: 40px 30px;">
              <h2 style="color: #002a50; margin: 0 0 15px 0; font-size: 22px; font-weight: 600;">¡Bienvenido a SGIAA!</h2>
              <p style="color: #555; line-height: 1.6; margin: 0 0 20px 0; font-size: 15px;">
                Gracias por registrarte en el Sistema de Gestión Académica de la Universidad Nacional de Chimborazo.
              </p>

              <p style="color: #555; line-height: 1.6; margin: 0 0 30px 0; font-size: 15px;">
                Para verificar tu cuenta y completar el proceso de registro, utiliza el siguiente código de 6 dígitos:
              </p>

              <!-- Código de verificación destacado -->
              <div style="background: linear-gradient(135deg, #f0f4f8 0%, #e8f0f7 100%); border-left: 4px solid #002a50; padding: 25px; text-align: center; border-radius: 8px; margin: 30px 0;">
                <p style="color: #002a50; margin: 0 0 10px 0; font-size: 13px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase;">Tu código de verificación</p>
                <div style="background: white; padding: 20px; border-radius: 6px; display: inline-block;">
                  <span style="color: #002a50; font-size: 48px; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', monospace;">${codigo}</span>
                </div>
                <p style="color: #888; margin: 15px 0 0 0; font-size: 12px;">Este código vence en 24 horas</p>
              </div>

              <p style="color: #555; line-height: 1.6; margin: 30px 0 20px 0; font-size: 14px;">
                <strong>¿Cómo verificar tu cuenta?</strong>
              </p>
              <ol style="color: #555; line-height: 1.8; margin: 0; padding-left: 20px; font-size: 14px;">
                <li>Ingresa a la plataforma SGIAA</li>
                <li>Ve a la sección de Verificación de Cuenta</li>
                <li>Copia y pega el código anterior</li>
                <li>¡Listo! Tu cuenta estará verificada</li>
              </ol>

              <p style="color: #888; line-height: 1.6; margin: 30px 0 0 0; font-size: 13px;">
                <strong>Importante:</strong> No compartas este código con nadie. UNACH nunca te pedirá tu código de verificación por correo o teléfono.
              </p>
            </div>

            <!-- Footer -->
            <div style="background: #f5f7fa; padding: 25px 30px; border-top: 1px solid #e0e0e0; text-align: center;">
              <p style="color: #666; margin: 0 0 10px 0; font-size: 13px;">
                <strong>Sistema de Gestión Académica</strong><br>
                Universidad Nacional de Chimborazo
              </p>
              <p style="color: #999; margin: 10px 0 0 0; font-size: 12px;">
                Riobamba - Ecuador<br>
                <a href="https://www.unach.edu.ec/" style="color: #002a50; text-decoration: none;">www.unach.edu.ec</a>
              </p>
              <p style="color: #ccc; margin: 15px 0 0 0; font-size: 11px;">
                © 2025 UNACH. Todos los derechos reservados.
              </p>
            </div>
          </div>
        </body>
        </html>
      `;
      
    await resend.emails.send({
      from: process.env.RESEND_FROM || "SGIAA <no-reply@sgiaair.com>",
      to: correo,
      subject: "🔐 Código de Verificación - SGIAA UNACH",
      html: emailHtml,
    });
      return res.status(200).json({ mensaje: "Usuario creado. Revisa tu correo para verificar." });

    } catch (e) {
      // ❌ si falla el envío, borra el usuario para que pueda reintentar
      db.query("DELETE FROM usuarios WHERE LOWER(correo) = ?", [correoNormalizado], () => {
        return res.status(500).json({
          mensaje: "No se pudo enviar el correo de verificación. Intenta nuevamente.",
          detalle: e.message
        });
      });
    }
  });
});

// CREAR USUARIO POR ADMIN (CON ENLACE DE VERIFICACIÓN AUTOMÁTICA)
app.post('/api/crear-estudiante-admin', (req, res) => {
  const { nombre, correo, password, rol } = req.body;

  // Validar campos obligatorios
  if (!nombre || !correo || !password || !rol) {
    return res.status(400).json({ mensaje: "Faltan datos obligatorios" });
  }

  // Trimear y normalizar datos
  const nombreTrimmed = nombre.trim();
  const correoNormalizado = correo.trim().toLowerCase();
  const passwordTrimmed = password.trim();

  // Validar
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(correoNormalizado)) {
    return res.status(400).json({ mensaje: "Correo inválido" });
  }

  // Generar token único para verificación
  const token = crypto.randomBytes(32).toString('hex');
  const enlaceVerificacion = `${process.env.BASE_URL || 'https://sgiaair.com'}/verificar-enlace?token=${token}`;

  const sql = `
    INSERT INTO usuarios (nombre, correo, password, rol, codigo_verificacion, es_verificado)
    VALUES (?, ?, ?, ?, ?, 0)
  `;

  db.query(sql, [nombreTrimmed, correoNormalizado, passwordTrimmed, rol, token], async (err) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ mensaje: "Este correo ya está registrado" });
      }
      return res.status(500).json({ mensaje: "Error en base de datos", detalle: err.message });
    }

    try {
      // ✅ EMAIL CON ENLACE DE VERIFICACIÓN
      const emailHtml = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verificar Cuenta - SGIAA UNACH</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);">
          <div style="max-width: 600px; margin: 30px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
            <!-- Header con color UNACH -->
            <div style="background: linear-gradient(135deg, #002a50 0%, #004d7a 100%); padding: 40px 20px; text-align: center;">
              <img src="https://www.unach.edu.ec/wp-content/uploads/2021/03/logo_unach_2021-02.png" alt="Logo UNACH" style="max-width: 180px; height: auto; margin-bottom: 15px;">
              <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">SGIAA - Sistema de Gestión Académica</h1>
              <p style="color: #b8d4f1; margin: 10px 0 0 0; font-size: 14px;">Universidad Nacional de Chimborazo</p>
            </div>

            <!-- Contenido principal -->
            <div style="padding: 40px 30px;">
              <h2 style="color: #002a50; margin: 0 0 15px 0; font-size: 22px; font-weight: 600;">¡Bienvenido a SGIAA!</h2>
              <p style="color: #555; line-height: 1.6; margin: 0 0 20px 0; font-size: 15px;">
                Tu cuenta ha sido creada en el Sistema de Gestión Académica de la Universidad Nacional de Chimborazo.
              </p>

              <p style="color: #555; line-height: 1.6; margin: 0 0 30px 0; font-size: 15px;">
                <strong>Datos de acceso:</strong><br>
                📧 Correo: ${correoNormalizado}<br>
                🔒 Contraseña: ${passwordTrimmed}<br>
              </p>

              <p style="color: #555; line-height: 1.6; margin: 0 0 30px 0; font-size: 15px;">
                Para acceder a tu cuenta, haz clic en el botón de abajo. Automáticamente se verificará y podrás iniciar sesión.
              </p>

              <!-- Botón de verificación -->
              <div style="text-align: center; margin: 40px 0;">
                <a href="${enlaceVerificacion}" style="background: linear-gradient(135deg, #002a50 0%, #004d7a 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 16px;">✓ Verificar Mi Cuenta</a>
              </div>

              <p style="color: #888; line-height: 1.6; margin: 30px 0 0 0; font-size: 13px;">
                <strong>¿No funcionó el botón?</strong> Copia y pega este enlace en tu navegador:<br>
                <span style="word-break: break-all; color: #002a50;">${enlaceVerificacion}</span>
              </p>
            </div>

            <!-- Footer -->
            <div style="background: #f5f7fa; padding: 25px 30px; border-top: 1px solid #e0e0e0; text-align: center;">
              <p style="color: #666; margin: 0 0 10px 0; font-size: 13px;">
                <strong>Sistema de Gestión Académica</strong><br>
                Universidad Nacional de Chimborazo
              </p>
              <p style="color: #999; margin: 10px 0 0 0; font-size: 12px;">
                Riobamba - Ecuador<br>
                <a href="https://www.unach.edu.ec/" style="color: #002a50; text-decoration: none;">www.unach.edu.ec</a>
              </p>
              <p style="color: #ccc; margin: 15px 0 0 0; font-size: 11px;">
                © 2025 UNACH. Todos los derechos reservados.
              </p>
            </div>
          </div>
        </body>
        </html>
      `;
      
      await resend.emails.send({
        from: process.env.RESEND_FROM || "SGIAA <no-reply@sgiaair.com>",
        to: correoNormalizado,
        subject: "✓ Verifica tu Cuenta - SGIAA UNACH",
        html: emailHtml,
      });

      return res.status(200).json({ 
        mensaje: "Usuario creado exitosamente. Se envió un enlace de verificación al correo.",
        usuario: { nombre: nombreTrimmed, correo: correoNormalizado, rol: rol }
      });

    } catch (e) {
      // Si falla el envío, borra el usuario
      db.query("DELETE FROM usuarios WHERE LOWER(correo) = ?", [correoNormalizado], () => {
        return res.status(500).json({
          mensaje: "No se pudo enviar el correo. Intenta nuevamente.",
          detalle: e.message
        });
      });
    }
  });
});

// VERIFICAR POR ENLACE (SIN CÓDIGO, SOLO TOKEN)
app.get('/api/verificar-enlace/:token', (req, res) => {
  const { token } = req.params;

  if (!token) {
    return res.status(400).json({ mensaje: "Token inválido" });
  }

  // Buscar usuario con ese token
  db.query("SELECT * FROM usuarios WHERE codigo_verificacion = ?", [token], (err, result) => {
    if (err) {
      return res.status(500).json({ mensaje: "Error en verificación", detalle: err.message });
    }

    if (!result || result.length === 0) {
      return res.status(400).json({ mensaje: "Token inválido o expirado" });
    }

    const usuario = result[0];

    // Marcar como verificado
    db.query("UPDATE usuarios SET es_verificado = 1 WHERE id = ?", [usuario.id], (err2) => {
      if (err2) {
        return res.status(500).json({ mensaje: "Error al verificar" });
      }

      // ✅ Retornar usuario para login automático
      res.json({
        mensaje: "¡Cuenta verificada correctamente! Iniciando sesión...",
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          correo: usuario.correo,
          rol: usuario.rol,
          es_verificado: 1
        }
      });
    });
  });
});

// RUTA HTML PARA VERIFICAR ENLACE (SOLO REDIRIGE AL DASHBOARD)
app.get('/verificar-enlace', (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error de Verificación</title>
        <style>body { font-family: Arial; text-align: center; padding: 50px; color: #d32f2f; }</style>
      </head>
      <body>
        <h1>Token inválido</h1>
        <p>El enlace de verificación no es válido o ha expirado.</p>
        <a href="/login.html">Volver al login</a>
      </body>
      </html>
    `);
  }

  // Verificar el token en la BD
  db.query("SELECT * FROM usuarios WHERE codigo_verificacion = ?", [token], (err, result) => {
    if (err || !result || result.length === 0) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Error de Verificación</title>
          <style>body { font-family: Arial; text-align: center; padding: 50px; color: #d32f2f; }</style>
        </head>
        <body>
          <h1>Token inválido</h1>
          <p>El enlace de verificación no es válido o ha expirado.</p>
          <a href="/login.html">Volver al login</a>
        </body>
        </html>
      `);
    }

    const usuario = result[0];

    // Marcar como verificado
    db.query("UPDATE usuarios SET es_verificado = 1 WHERE id = ?", [usuario.id], (err2) => {
      if (err2) {
        return res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Error de Verificación</title>
            <style>body { font-family: Arial; text-align: center; padding: 50px; color: #d32f2f; }</style>
          </head>
          <body>
            <h1>Error en la verificación</h1>
            <p>Intenta nuevamente más tarde.</p>
            <a href="/login.html">Volver al login</a>
          </body>
          </html>
        `);
      }

      // ✅ VERIFICACIÓN EXITOSA - REDIRIGIR AL DASHBOARD CON DATOS DEL USUARIO
      const usuarioJSON = JSON.stringify(usuario).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
      
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Cuenta Verificada - Iniciando Sesión...</title>
          <style>
            body { font-family: Arial; text-align: center; padding: 50px; color: #004d7a; }
            .success { color: #2e7d32; }
          </style>
        </head>
        <body>
          <h1 class="success">✓ ¡Cuenta Verificada Correctamente!</h1>
          <p>Estamos iniciando tu sesión automáticamente...</p>
          <p>Si no eres redirigido en 3 segundos, <a href="/dashboard.html">haz clic aquí</a>.</p>
          <script>
            // Guardar usuario en localStorage y redirigir
            const usuario = ${usuarioJSON};
            localStorage.setItem('usuario', JSON.stringify(usuario));
            setTimeout(() => {
              window.location.href = '/dashboard.html';
            }, 2000);
          </script>
        </body>
        </html>
      `);
    });
  });
});

// ... (resto del código del servidor: login, verificar, etc.) ...
// RUTA PARA REENVIAR CÓDIGO DE VERIFICACIÓN si no llegó el correo original
app.post('/api/reenviar-codigo', (req, res) => {
    const { correo } = req.body;
    
    // Validar que el correo no esté vacío
    if (!correo) {
        return res.status(400).json({ mensaje: "El correo es obligatorio" });
    }

    // Trimear y normalizar correo
    const correoNormalizado = correo.trim().toLowerCase();

    db.query("SELECT * FROM usuarios WHERE LOWER(correo) = ?", [correoNormalizado], async (err, r) => {
        if (err) return res.status(500).json({ mensaje: "Error DB", detalle: err.message });
        if (!r || r.length === 0) return res.status(404).json({ mensaje: "No existe ese correo" });

        const u = r[0];
        if (u.es_verificado === 1) return res.status(400).json({ mensaje: "La cuenta ya está verificada" });

        const nuevoCodigo = Math.floor(100000 + Math.random() * 900000).toString();

        db.query("UPDATE usuarios SET codigo_verificacion = ? WHERE LOWER(correo) = ?", [nuevoCodigo, correoNormalizado], async (err2) => {
        if (err2) return res.status(500).json({ mensaje: "Error DB", detalle: err2.message });

        try {
            const emailHtml = `
              <!DOCTYPE html>
              <html lang="es">
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Reenvío de Código - SGIAA UNACH</title>
              </head>
              <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);">
                <div style="max-width: 600px; margin: 30px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
                  <!-- Header con color UNACH -->
                  <div style="background: linear-gradient(135deg, #002a50 0%, #004d7a 100%); padding: 40px 20px; text-align: center;">
                    <img src="https://unach.edu.ec/wp-content/uploads/2019/06/logo-unach-blanco.png" alt="Logo UNACH" style="max-width: 180px; height: auto; margin-bottom: 15px;">
                    <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">SGIAA - Sistema de Gestión Académica</h1>
                    <p style="color: #b8d4f1; margin: 10px 0 0 0; font-size: 14px;">Universidad Nacional de Chimborazo</p>
                  </div>

                  <!-- Contenido principal -->
                  <div style="padding: 40px 30px;">
                    <h2 style="color: #002a50; margin: 0 0 15px 0; font-size: 22px; font-weight: 600;">Reenvío de Código de Verificación</h2>
                    <p style="color: #555; line-height: 1.6; margin: 0 0 20px 0; font-size: 15px;">
                      Hemos generado un nuevo código de verificación para tu cuenta en SGIAA.
                    </p>

                    <p style="color: #555; line-height: 1.6; margin: 0 0 30px 0; font-size: 15px;">
                      Utiliza el siguiente código para completar la verificación de tu cuenta:
                    </p>

                    <!-- Código de verificación destacado -->
                    <div style="background: linear-gradient(135deg, #f0f4f8 0%, #e8f0f7 100%); border-left: 4px solid #002a50; padding: 25px; text-align: center; border-radius: 8px; margin: 30px 0;">
                      <p style="color: #002a50; margin: 0 0 10px 0; font-size: 13px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase;">Tu nuevo código de verificación</p>
                      <div style="background: white; padding: 20px; border-radius: 6px; display: inline-block;">
                        <span style="color: #002a50; font-size: 48px; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', monospace;">${nuevoCodigo}</span>
                      </div>
                      <p style="color: #888; margin: 15px 0 0 0; font-size: 12px;">Este código vence en 24 horas</p>
                    </div>

                    <p style="color: #555; line-height: 1.6; margin: 30px 0 0 0; font-size: 14px;">
                      <strong>⚠️ Recuerda:</strong> Si no solicitaste este código, puedes ignorar este correo. Tu cuenta permanecerá segura.
                    </p>
                  </div>

                  <!-- Footer -->
                  <div style="background: #f5f7fa; padding: 25px 30px; border-top: 1px solid #e0e0e0; text-align: center;">
                    <p style="color: #666; margin: 0 0 10px 0; font-size: 13px;">
                      <strong>Sistema de Gestión Académica</strong><br>
                      Universidad Nacional de Chimborazo
                    </p>
                    <p style="color: #999; margin: 10px 0 0 0; font-size: 12px;">
                      Riobamba - Ecuador<br>
                      <a href="https://unach.edu.ec" style="color: #002a50; text-decoration: none;">www.unach.edu.ec</a>
                    </p>
                    <p style="color: #ccc; margin: 15px 0 0 0; font-size: 11px;">
                      © 2025 UNACH. Todos los derechos reservados.
                    </p>
                  </div>
                </div>
              </body>
              </html>
            `;
            
            await resend.emails.send({
              from: process.env.RESEND_FROM || "SGIAA <no-reply@sgiaair.com>",
              to: u.correo,
              subject: "🔄 Reenvío de Código de Verificación - SGIAA UNACH",
              html: emailHtml,
            });

            return res.json({ mensaje: "Código reenviado. Revisa tu correo (y Spam)." });
        } catch (e) {
            return res.status(500).json({ mensaje: "No se pudo reenviar el correo", detalle: e.message });
        }
        });
    });
    });
// VERIFICAR
app.post('/api/verificar', (req, res) => {
    const { correo, codigo } = req.body;
    
    // Validar que los campos no estén vacíos
    if (!correo || !codigo) {
        return res.status(400).json({ mensaje: "Correo y código son obligatorios" });
    }

    // Trimear y normalizar correo
    const correoNormalizado = correo.trim().toLowerCase();
    const codigoTrimmed = codigo.toString().trim();

    // Validar formato del código (debe ser exactamente 6 dígitos)
    if (!/^\d{6}$/.test(codigoTrimmed)) {
        return res.status(400).json({ mensaje: "El código debe tener exactamente 6 dígitos" });
    }

    console.log("🔐 Intentando verificar:", { correo: correoNormalizado, codigo: codigoTrimmed });
    
    db.query("SELECT * FROM usuarios WHERE LOWER(correo) = ? AND codigo_verificacion = ?", [correoNormalizado, codigoTrimmed], (err, r) => {
        if (err) {
            console.log("❌ Error en verificación:", err.message);
            return res.status(500).json({ mensaje: "Error al verificar" });
        }
        
        if (r.length === 0) {
            console.log("❌ Código incorrecto para:", correoNormalizado);
            return res.status(400).json({ mensaje: "Código incorrecto" });
        }
        
        console.log("✅ Código correcto, actualizando usuario:", correoNormalizado);
        db.query("UPDATE usuarios SET es_verificado = 1 WHERE LOWER(correo) = ?", [correoNormalizado], (err2) => {
            if (err2) {
                console.log("❌ Error al actualizar:", err2.message);
                return res.status(500).json({ mensaje: "Error al verificar cuenta" });
            }
            console.log("✅ Usuario verificado:", correoNormalizado);
            // Retornar datos del usuario para login automático
            const usuario = r[0];
            res.status(200).json({ 
                mensaje: "Cuenta verificada correctamente", 
                usuario: {
                    id: usuario.id,
                    nombre: usuario.nombre,
                    correo: usuario.correo,
                    rol: usuario.rol,
                    es_verificado: 1
                }
            });
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

// EDITAR USUARIO POR ADMIN (REENVÍA ENLACE DE VERIFICACIÓN)
app.post('/api/editar-usuario-admin/:id', (req, res) => {
  const { id } = req.params;
  const { nombre, correo, password } = req.body;

  // Validar campos
  if (!nombre || !correo || !password) {
    return res.status(400).json({ mensaje: "Todos los campos son obligatorios" });
  }

  const nombreTrimmed = nombre.trim();
  const correoNormalizado = correo.trim().toLowerCase();
  const passwordTrimmed = password.trim();

  // Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(correoNormalizado)) {
    return res.status(400).json({ mensaje: "Correo inválido" });
  }

  // Generar nuevo token para verificación
  const token = crypto.randomBytes(32).toString('hex');
  const enlaceVerificacion = `${process.env.BASE_URL || 'https://sgiaair.com'}/verificar-enlace?token=${token}`;

  // Actualizar usuario y marcar como pendiente
  const sql = `UPDATE usuarios SET nombre = ?, correo = ?, password = ?, codigo_verificacion = ?, es_verificado = 0 WHERE id = ?`;

  db.query(sql, [nombreTrimmed, correoNormalizado, passwordTrimmed, token, id], async (err) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ mensaje: "Este correo ya está registrado" });
      }
      return res.status(500).json({ mensaje: "Error en base de datos", detalle: err.message });
    }

    try {
      // EMAIL CON ENLACE DE VERIFICACIÓN
      const emailHtml = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verificar Cambios - SGIAA UNACH</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);">
          <div style="max-width: 600px; margin: 30px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #002a50 0%, #004d7a 100%); padding: 40px 20px; text-align: center;">
              <img src="https://www.unach.edu.ec/wp-content/uploads/2021/03/logo_unach_2021-02.png" alt="Logo UNACH" style="max-width: 180px; height: auto; margin-bottom: 15px;">
              <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">SGIAA - Sistema de Gestión Académica</h1>
              <p style="color: #b8d4f1; margin: 10px 0 0 0; font-size: 14px;">Universidad Nacional de Chimborazo</p>
            </div>

            <!-- Contenido principal -->
            <div style="padding: 40px 30px;">
              <h2 style="color: #002a50; margin: 0 0 15px 0; font-size: 22px; font-weight: 600;">Tu Cuenta Fue Actualizada</h2>
              <p style="color: #555; line-height: 1.6; margin: 0 0 20px 0; font-size: 15px;">
                Tu información ha sido actualizada en el Sistema de Gestión Académica. Para confirmar los cambios, por favor verifica tu cuenta.
              </p>

              <p style="color: #555; line-height: 1.6; margin: 0 0 30px 0; font-size: 15px;">
                <strong>Nuevos datos:</strong><br>
                📧 Correo: ${correoNormalizado}<br>
                🔒 Contraseña: ${passwordTrimmed}<br>
              </p>

              <!-- Botón de verificación -->
              <div style="text-align: center; margin: 40px 0;">
                <a href="${enlaceVerificacion}" style="background: linear-gradient(135deg, #002a50 0%, #004d7a 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 16px;">✓ Verificar Cambios</a>
              </div>

              <p style="color: #888; line-height: 1.6; margin: 30px 0 0 0; font-size: 13px;">
                <strong>¿No funcionó el botón?</strong> Copia y pega este enlace:<br>
                <span style="word-break: break-all; color: #002a50;">${enlaceVerificacion}</span>
              </p>
            </div>

            <!-- Footer -->
            <div style="background: #f5f7fa; padding: 25px 30px; border-top: 1px solid #e0e0e0; text-align: center;">
              <p style="color: #666; margin: 0 0 10px 0; font-size: 13px;">
                <strong>Sistema de Gestión Académica</strong><br>
                Universidad Nacional de Chimborazo
              </p>
              <p style="color: #999; margin: 10px 0 0 0; font-size: 12px;">
                Riobamba - Ecuador<br>
                <a href="https://www.unach.edu.ec/" style="color: #002a50; text-decoration: none;">www.unach.edu.ec</a>
              </p>
              <p style="color: #ccc; margin: 15px 0 0 0; font-size: 11px;">
                © 2025 UNACH. Todos los derechos reservados.
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      await resend.emails.send({
        from: process.env.RESEND_FROM || "SGIAA <no-reply@sgiaair.com>",
        to: correoNormalizado,
        subject: "✏️ Cambios en tu Cuenta - SGIAA UNACH",
        html: emailHtml,
      });

      return res.status(200).json({
        mensaje: "Usuario actualizado. Se envió un enlace de verificación al correo.",
        usuario: { id, nombre: nombreTrimmed, correo: correoNormalizado, es_verificado: 0 }
      });

    } catch (e) {
      return res.status(500).json({
        mensaje: "No se pudo enviar el correo. Intenta nuevamente.",
        detalle: e.message
      });
    }
  });
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