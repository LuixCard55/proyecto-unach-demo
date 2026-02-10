# SOLUCIÓN COMPLETA - Problema de Registro y Verificación

## Resumen del Problema
Los usuarios no ven la sección de verificación de código después de registrarse.

## Cambios Realizados

### 1. Servidor (`server.js`)

#### Endpoint `/api/usuarios` (Registro)
```javascript
// ANTES: res.json() sin status explícito
// DESPUÉS: res.status(200).json() con logs
```

**Cambios:**
- ✅ Status code 200 explícito
- ✅ Logs detallados con emojis
- ✅ Mejora de manejo de errores

**Resultado:** El servidor ahora responde con status 200 y `res.ok = true`

#### Endpoint `/api/verificar` (Verificación)
- ✅ Status codes explícitos (200, 400, 500)
- ✅ Logs detallados
- ✅ Mejor manejo de errores

### 2. Cliente (`public/login.html`)

#### Función `hacerRegistro()`
**Mejoras:**
- ✅ Validación de campos antes de enviar
- ✅ Trim de espacios en blanco
- ✅ Validación de contraseña (mínimo 6 caracteres)
- ✅ Logs detallados con emojis para seguimiento
- ✅ Manejo robusto de errores

**Flujo Correcto:**
```
Usuario llena formulario
        ↓
Click "CREAR CUENTA"
        ↓
Validación local
        ↓
POST a /api/usuarios
        ↓
Servidor retorna 200
        ↓
res.ok === true
        ↓
Oculta form-registro
Muestra seccion-verificacion
        ↓
Alert: "¡Código enviado!"
```

#### Función `verificarCodigo()`
- ✅ Validación de código (6 dígitos)
- ✅ Logs detallados
- ✅ Mejor manejo de errores

## Cómo Probar (Paso a Paso)

### Requisitos Previos
1. Node.js instalado
2. MySQL conectado (XAMPP o Railway)
3. Variables de entorno configuradas (EMAIL_USER, EMAIL_PASS)

### Paso 1: Inicia el Servidor
```bash
cd "d:\Downloads\Proyecto UNACH LUCHO\proyecto_unach\proyecto_unach"
node server.js
```

Deberías ver:
```
✅ Base de Datos Conectada
🚀 Servidor listo en puerto 3000
```

### Paso 2: Abre el Navegador
```
http://localhost:3000/login.html
```

### Paso 3: Abre la Consola de Desarrollador
- Windows/Linux: `F12` o `Ctrl+Shift+I`
- Mac: `Cmd+Option+I`
- Ve a la pestaña "Console"

### Paso 4: Completa el Formulario
- Nombre: `Test User`
- Correo: `test.nuevo@example.com` (usa algo único)
- Contraseña: `123456`
- Rol: `Estudiante`

### Paso 5: Observa los Logs
En la consola del navegador deberías ver:
```
📝 Intentando registrar: {
  nombre: "Test User",
  correo: "test.nuevo@example.com",
  password: "123456",
  rol: "estudiante"
}

📬 Respuesta del servidor: {
  status: 200,
  ok: true,
  data: {
    mensaje: "Usuario creado. Revisa tu correo para verificar."
  }
}

✅ Registro exitoso, mostrando verificación
```

### Paso 6: Verifica que Aparezca la Sección de Verificación
La sección de verificación debe aparecer reemplazando el formulario de registro.

### Paso 7: Obtén el Código
**Opción A - Desde el Email:**
Revisa tu bandeja de entrada por el correo de verificación.

**Opción B - Desde la BD:**
```sql
SELECT codigo_verificacion FROM usuarios WHERE correo = 'test.nuevo@example.com' LIMIT 1;
```

### Paso 8: Ingresa el Código
- Copia el código de 6 dígitos
- Pégalo en el campo
- Click en "VERIFICAR"

### Paso 9: Verifica el Log de Verificación
Deberías ver:
```
🔐 Verificando código: {
  correo: "test.nuevo@example.com",
  codigo: "123456"
}

📬 Respuesta de verificación: {
  status: 200,
  data: { mensaje: "OK" }
}

✅ Código verificado correctamente
```

### Paso 10: Login
- Ve a la pestaña "Ingresar"
- Ingresa el correo y contraseña
- Click en "INICIAR SESIÓN"

Deberías entrar al dashboard.

## Solución de Problemas

### Error: "Este correo ya está registrado"
```
Causa: El correo ya existe en la BD
Solución: Usa otro correo o elimina el usuario anterior de la BD
```

### No aparece la sección de verificación
```
Paso 1: Abre F12 → Console
Paso 2: Busca el log "📬 Respuesta del servidor"
Paso 3: Verifica que status sea 200 y ok sea true
Paso 4: Si not, busca el mensaje de error en data.mensaje
```

### No llega el email
```
Causa: EMAIL_USER o EMAIL_PASS no configurados
Solución:
1. Crea archivo .env en la raíz del proyecto
2. Agrega:
   EMAIL_USER=tu_email@gmail.com
   EMAIL_PASS=tu_app_password
3. Reinicia el servidor
4. Si usas Gmail: genera App Password (no uses tu contraseña normal)
```

### Error de conexión
```
Causa: Servidor no está corriendo
Solución: Ejecuta: node server.js
```

## Verificación en Servidor

En la terminal donde corre el servidor, deberías ver:

### Al Registrar:
```
✅ Usuario insertado: test.nuevo@example.com
📌 Código de verificación: 123456
📧 Correo enviado exitosamente a: test.nuevo@example.com
```

O si hay error con email:
```
📧 No se pudo enviar correo: [error details]
📌 Pero el usuario se registró. Código: 123456
```

### Al Verificar:
```
🔐 Intentando verificar: { correo: "test.nuevo@example.com", codigo: "123456" }
✅ Código correcto, actualizando usuario: test.nuevo@example.com
✅ Usuario verificado: test.nuevo@example.com
```

## Archivos Modificados

1. **server.js**
   - `/api/usuarios` - Mejorado con status explícito y logs
   - `/api/verificar` - Mejorado con status explícito y logs

2. **public/login.html**
   - `hacerRegistro()` - Mejorado con validación y logs
   - `verificarCodigo()` - Mejorado con validación y logs

## Tabla de Referencia

| Paso | Acción | Log Esperado |
|------|--------|--------------|
| 1 | Submit formulario | `📝 Intentando registrar` |
| 2 | Servidor procesa | `✅ Usuario insertado` |
| 3 | Servidor envía email | `📧 Correo enviado` |
| 4 | Cliente recibe respuesta | `📬 Respuesta del servidor` |
| 5 | Verificar res.ok | status: 200, ok: true |
| 6 | Mostrar seccion-verificacion | `✅ Registro exitoso` |
| 7 | Usuario ingresa código | `🔐 Verificando código` |
| 8 | Servidor valida | `✅ Código correcto` |
| 9 | Usuario verificado | `✅ Usuario verificado` |

## Comandos Útiles

### Probar el servidor está arriba:
```bash
node test-server.js
```

### Probar registro desde terminal:
```bash
python test_registro.py
```

### Ver código de usuario en BD:
```bash
# En phpMyAdmin o terminal MySQL
SELECT id, nombre, correo, codigo_verificacion, es_verificado FROM usuarios WHERE correo = 'test@example.com';
```

## Contacto y Soporte

Si después de seguir estos pasos aún tienes problemas:

1. **Verifica los logs** en:
   - Consola del navegador (F12 → Console)
   - Terminal del servidor (donde corre `node server.js`)

2. **Copia los mensajes de error** exactamente

3. **Verifica que:**
   - Puerto 3000 está disponible
   - MySQL está corriendo
   - Todos los campos se llenan en el formulario
   - La contraseña tiene al menos 6 caracteres

4. **Limpia y recarga:**
   - `Ctrl+Shift+Delete` (borra cache)
   - `Ctrl+F5` (recarga fuerza)

---

✅ **Estado:** Solución completa implementada y lista para probar
📅 **Fecha:** Febrero 2025
🔧 **Versión:** 1.0
