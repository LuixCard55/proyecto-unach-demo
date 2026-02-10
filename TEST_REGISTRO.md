# Pruebas del Flujo de Registro

## Problema Reportado
Al registrarse, debe mostrar un apartado sobre ingresar el código que llega al correo, pero eso no aparece.

## Causa Identificada
El formulario de registro intenta mostrar la sección de verificación cuando `res.ok === true`, pero:
1. El servidor retorna `res.json()` sin especificar status code explícitamente (defaultea a 200)
2. El cliente puede no estar interpretando correctamente la respuesta

## Cambios Realizados

### 1. En `server.js` (`/api/usuarios`):
- ✅ Agregado `console.log` para debug
- ✅ Cambiado `res.json()` a `res.status(200).json()` explícitamente
- ✅ Agregados logs detallados del código de verificación y correo

### 2. En `login.html` (`hacerRegistro()`):
- ✅ Agregado `console.log` detallado en cada paso
- ✅ Mejora de manejo de errores con mensajes específicos
- ✅ Log del status de la respuesta
- ✅ Verificación de `res.ok` con console

### 3. En `login.html` (`verificarCodigo()`):
- ✅ Agregado validación de código (mínimo 6 dígitos)
- ✅ Agregados logs detallados
- ✅ Mejor manejo de errores

## Pasos para Probar

1. **Abre la consola de navegador** (F12 en Chrome/Firefox)
2. **Intenta registrarte** con:
   - Nombre: Test User
   - Correo: test@example.com
   - Contraseña: 12345
   - Rol: Estudiante
3. **Observa en la consola**:
   - Debe ver: `📝 Intentando registrar: {...}`
   - Debe ver: `📬 Respuesta del servidor: { status: 200, data: {...} }`
   - Debe ver: `✅ Registro exitoso, mostrando verificación`
4. **Verifica que aparezca** la sección de verificación
5. **Revisa el correo** y copia el código (6 dígitos)
6. **Ingresa el código** en la sección de verificación

## Problemas Posibles

### El registro falla con "Este correo ya está registrado"
- Usa un correo diferente
- O elimina el usuario anterior de la BD

### No aparece la sección de verificación
- Abre F12 (consola de developer)
- Busca si hay errores JavaScript
- Verifica que `res.ok` sea `true`
- Revisa el status code en la Network tab

### No llega el correo
- Revisa que `EMAIL_USER` y `EMAIL_PASS` estén configurados en `.env`
- Gmail requiere "App Passwords" si tienes 2FA activado
- Revisa la carpeta Spam

## Archivos Modificados
- `server.js` - Agregados logs y status codes explícitos
- `public/login.html` - Mejorados logs y manejo de errores
