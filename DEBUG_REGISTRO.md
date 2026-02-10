# GUÍA DE DEPURACIÓN - PROBLEMA DE REGISTRO

## Problema Original
"Al registrarse debe mostrar un apartado sobre ingresar el código que llega al correo, al registrarse eso no aparece"

## Diagnóstico
El formulario de registro no muestra la sección de verificación de código después de registrarse exitosamente.

## Soluciones Implementadas

### 1. **Server.js** - Mejorado `/api/usuarios` endpoint
**Cambios:**
- ✅ Status code explícito: `res.status(200).json()`
- ✅ Logs detallados de cada paso
- ✅ Imprime el código de verificación generado
- ✅ Imprime confirmación de envío de correo

**Resultado esperado en consola del servidor:**
```
✅ Usuario insertado: test@example.com
📌 Código de verificación: 123456
📧 Correo enviado exitosamente a: test@example.com
```

### 2. **Server.js** - Mejorado `/api/verificar` endpoint
**Cambios:**
- ✅ Validación de errores mejorada
- ✅ Logs en cada paso
- ✅ Status codes explícitos (200 para éxito, 400/500 para errores)

### 3. **login.html** - Función `hacerRegistro()`
**Cambios:**
- ✅ Validación de campos antes de enviar
- ✅ Trim de espacios en blanco
- ✅ Validación de contraseña mínima (6 caracteres)
- ✅ Logs detallados con emojis para fácil seguimiento
- ✅ Manejo robusto de errores

**Flujo esperado:**
1. Usuario completa formulario
2. Click en "CREAR CUENTA"
3. Validación de campos
4. Envío POST a `/api/usuarios`
5. Log: `📝 Intentando registrar`
6. Servidor responde
7. Log: `📬 Respuesta del servidor: { status: 200, ok: true, data: {...} }`
8. Si `res.ok === true`:
   - Oculta formulario: `form-registro.display = 'none'`
   - Muestra verificación: `seccion-verificacion.display = 'block'`
   - Log: `✅ Registro exitoso, mostrando verificación`

### 4. **login.html** - Función `verificarCodigo()`
**Cambios:**
- ✅ Validación de código (mínimo 6 dígitos)
- ✅ Logs detallados
- ✅ Mejor manejo de errores

## Cómo Probar

### Paso 1: Abre la consola de desarrollador
```
Windows/Linux: F12 o Ctrl+Shift+I
Mac: Cmd+Option+I
```

### Paso 2: Ve a la pestaña "Console" (Consola)

### Paso 3: Completa el formulario de registro
- Nombre: `Juan Pérez`
- Correo: `juan.perez.2025@example.com` (usa un correo único)
- Contraseña: `123456`
- Rol: `Estudiante`

### Paso 4: Observa los logs en consola
Deberías ver:
```
📝 Intentando registrar: {nombre: "Juan Pérez", correo: "juan.perez.2025@example.com", ...}
📬 Respuesta del servidor: {status: 200, ok: true, data: {mensaje: "Usuario creado. Revisa tu correo..."}}
✅ Registro exitoso, mostrando verificación
```

### Paso 5: Verifica que aparezca la sección de verificación
La sección de verificación debe aparecer bajo el formulario con:
- Campo de texto para ingresar código
- Botón "VERIFICAR"

### Paso 6: Obtén el código de verificación
**Opción A - Si configuraste email:**
Revisa tu bandeja de entrada

**Opción B - Desde la base de datos:**
```sql
SELECT codigo_verificacion FROM usuarios WHERE correo = 'juan.perez.2025@example.com' LIMIT 1;
```

### Paso 7: Ingresa el código
- Copia el código de 6 dígitos
- Pégalo en el campo de texto
- Click en "VERIFICAR"

### Paso 8: Verifica en consola
Deberías ver:
```
🔐 Verificando código: {correo: "juan.perez.2025@example.com", codigo: "123456"}
📬 Respuesta de verificación: {status: 200, ok: true, data: {mensaje: "OK"}}
✅ Código verificado correctamente
```

## Solución de Problemas

### ❌ "Faltan datos obligatorios"
**Causa:** No completaste todos los campos
**Solución:** Asegúrate de llenar Nombre, Correo, Contraseña y elegir un Rol

### ❌ "Este correo ya está registrado"
**Causa:** El correo ya existe en la BD
**Solución:** Usa otro correo o elimina el usuario anterior

### ❌ No aparece la sección de verificación
**Causa:** Posibles razones:
1. `res.ok` es false (ver console)
2. Error en servidor (ver logs del servidor)
3. Error de JavaScript (ver console para errores)

**Depuración:**
- Abre F12 → Console
- Busca errores en rojo
- Verifica que `status: 200` en el log
- Revisa si `ok: true` en la respuesta

### ❌ No llega el correo de verificación
**Causa:** Email no configurado o credenciales incorrectas
**Solución:**
1. Verifica `EMAIL_USER` y `EMAIL_PASS` en `.env`
2. Si usas Gmail con 2FA: usa App Passwords, no contraseña normal
3. Revisa carpeta Spam
4. Revisa logs del servidor para errores de envío

### ❌ "Código incorrecto" al verificar
**Causa:** Código no coincide
**Solución:**
1. Copia el código exactamente como aparece en el email
2. No uses espacios en blanco
3. Debe ser de 6 dígitos
4. Verifica que sea del usuario correcto

## Archivos Modificados
1. `server.js` - Mejorados endpoints `/api/usuarios` y `/api/verificar`
2. `public/login.html` - Mejoradas funciones `hacerRegistro()` y `verificarCodigo()`

## Verificar en Servidor

Cuando registres un usuario, deberías ver en la terminal del servidor:

```
✅ Usuario insertado: test@example.com
📌 Código de verificación: 123456
📧 Correo enviado exitosamente a: test@example.com
```

Si ves errores en lugar de esto, revisa:
1. ¿Está la BD conectada? (conexión a XAMPP o Railway)
2. ¿Tiene la tabla `usuarios` las columnas correctas?
3. ¿Está configurado Nodemailer?

## Video Tutorial Alternativo

Si necesitas ver paso a paso:
1. Abre navegador en http://localhost:3000/login.html
2. Abre F12
3. Ve a Network tab
4. Intenta registrarte
5. Busca la petición POST a `/api/usuarios`
6. Revisa:
   - Request body (datos enviados)
   - Response (respuesta del servidor)
   - Status (debe ser 200)
