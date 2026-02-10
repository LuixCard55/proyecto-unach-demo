# ✅ CHECKLIST - Verificación del Flujo de Registro

## Antes de Probar

- [ ] Node.js está instalado en tu PC
- [ ] MySQL está corriendo (XAMPP, Docker, o Railway)
- [ ] Clonaste el proyecto desde GitHub
- [ ] Instalaste dependencias: `npm install`
- [ ] Creaste la BD: `unach_sgiaa`
- [ ] Ejecutaste el script SQL: `unach_sgiaa.sql`

## Configuración del Email (Opcional pero Recomendado)

- [ ] Creaste archivo `.env` en la raíz del proyecto
- [ ] Agregaste `EMAIL_USER=tu_email@gmail.com`
- [ ] Agregaste `EMAIL_PASS=tu_app_password`
- [ ] Si usas Gmail: generaste App Password (no contraseña normal)
- [ ] Guardaste el archivo

## Iniciando el Servidor

- [ ] Terminal abierta en la carpeta del proyecto
- [ ] Ejecutaste: `node server.js`
- [ ] Ves el mensaje: `✅ Base de Datos Conectada`
- [ ] Ves el mensaje: `🚀 Servidor listo en puerto 3000`
- [ ] NO hay errores en rojo en la terminal

## Abriendo el Navegador

- [ ] Navegador abierto (Chrome, Firefox, Edge, etc.)
- [ ] URL: `http://localhost:3000/login.html`
- [ ] La página cargó correctamente
- [ ] Ves el logo de UNACH
- [ ] Ves dos pestañas: "Ingresar" y "Registrarse"

## Abriendo la Consola de Desarrollador

- [ ] Presionaste `F12` (Windows/Linux) o `Cmd+Option+I` (Mac)
- [ ] Se abrió la ventana de herramientas de desarrollo
- [ ] Estás en la pestaña "Console" (Consola)
- [ ] La consola está limpia (sin errores previos)

## Completando el Formulario de Registro

- [ ] Hiciste click en la pestaña "Registrarse"
- [ ] Llenas el campo "Nombre Completo": `Juan Carlos Test`
- [ ] Llenas el campo "Correo": `juancarlos.test.2025@example.com`
- [ ] Llenas el campo "Contraseña": `123456`
- [ ] Seleccionas "Estudiante" en el dropdown de Rol
- [ ] Todos los campos tienen datos (no están vacíos)

## Enviando el Formulario

- [ ] Hiciste click en el botón "CREAR CUENTA" (verde)
- [ ] La consola mostró logs (no errores rojos)
- [ ] Viste el log: `📝 Intentando registrar:`

## Verificando la Respuesta del Servidor

En la consola deberías ver:
```
📬 Respuesta del servidor: {
  status: 200,
  ok: true,
  data: { mensaje: "Usuario creado. Revisa tu correo..." }
}

✅ Registro exitoso, mostrando verificación
```

Checklist:
- [ ] Ves `status: 200`
- [ ] Ves `ok: true`
- [ ] Ves el mensaje "Usuario creado"
- [ ] Ves `✅ Registro exitoso, mostrando verificación`

## Verificando que Aparezca la Sección de Verificación

- [ ] El formulario de registro desapareció
- [ ] Apareció una nueva sección con:
  - [ ] Mensaje: "Revisa tu bandeja de entrada (o Spam)"
  - [ ] Campo de texto: "CÓDIGO"
  - [ ] Botón: "VERIFICAR"

## Obteniendo el Código de Verificación

**Opción A: Desde el Email**
- [ ] Recibirás un email en la bandeja de entrada
- [ ] Asunto: "Código de Verificación"
- [ ] Contiene el código de 6 dígitos

**Opción B: Desde la Base de Datos**
- [ ] Abre phpMyAdmin (http://localhost/phpmyadmin)
- [ ] Base de datos: `unach_sgiaa`
- [ ] Tabla: `usuarios`
- [ ] Busca el usuario que acabas de crear
- [ ] Copia el valor de `codigo_verificacion`

Checklist:
- [ ] Obtuviste el código de 6 dígitos
- [ ] El código está sin espacios

## Ingresando el Código

- [ ] Copias el código de 6 dígitos
- [ ] Lo pegas en el campo "CÓDIGO"
- [ ] Haces click en "VERIFICAR" (botón naranja)

## Verificando el Código

En la consola deberías ver:
```
🔐 Verificando código: {
  correo: "juancarlos.test.2025@example.com",
  codigo: "123456"
}

📬 Respuesta de verificación: {
  status: 200,
  data: { mensaje: "OK" }
}

✅ Código verificado correctamente
```

Checklist:
- [ ] Ves `🔐 Verificando código`
- [ ] Ves `status: 200`
- [ ] Ves `✅ Código verificado correctamente`
- [ ] Recibiste un alert: "Cuenta verificada. Inicia sesión."

## Haciendo Login

- [ ] Hiciste click en "Aceptar" en el alert
- [ ] Se recargó la página
- [ ] Ves nuevamente las pestañas "Ingresar" y "Registrarse"
- [ ] Hiciste click en la pestaña "Ingresar"
- [ ] Llenaste el correo: `juancarlos.test.2025@example.com`
- [ ] Llenaste la contraseña: `123456`
- [ ] Hiciste click en "INICIAR SESIÓN"

## Entraste al Dashboard

- [ ] La página cambió a `dashboard.html`
- [ ] Ves la interfaz principal con:
  - [ ] Hamburguesa (menú) en la esquina superior izquierda
  - [ ] Nombre del usuario en la esquina superior derecha
  - [ ] Contenido del dashboard

## ¡Éxito! ✅

Si completaste todos los puntos anteriores, el flujo de registro y verificación **está funcionando correctamente**.

---

## Si Algo Salió Mal ❌

### Error: "Este correo ya está registrado"
**Pasos:**
1. Usa un correo diferente (agrega número: `test.2025@`)
2. O elimina el usuario de la BD antes de intentar de nuevo

### Error: "Faltan datos obligatorios"
**Pasos:**
1. Asegúrate de llenar TODOS los campos
2. No dejes ninguno en blanco
3. La contraseña debe tener al menos 6 caracteres

### No aparece la sección de verificación
**Pasos:**
1. Abre F12 → Console
2. Busca mensajes en rojo (errores)
3. Copia el error exacto
4. Revisa el log "Respuesta del servidor"
5. Si status NO es 200, hay un problema en el servidor

### No llega el email
**Pasos:**
1. Verifica que EMAIL_USER y EMAIL_PASS estén configurados en `.env`
2. Revisa la carpeta Spam de tu email
3. Si usas Gmail: verifica que generaste App Password
4. Revisa los logs del servidor en la terminal

### Error de conexión
**Pasos:**
1. Verifica que el servidor esté corriendo: `node server.js`
2. Verifica que veas: `✅ Base de Datos Conectada`
3. Verifica que no hay errores en rojo en la terminal

### Formulario no envía datos
**Pasos:**
1. Abre F12 → Console
2. Busca errores en rojo
3. Revisa que haya JavaScript sin errores
4. Recarga la página: `Ctrl+F5`

---

## Resumen del Flujo Correcto

```
Formulario de Registro
        ↓
Usuario llena datos
        ↓
Click "CREAR CUENTA"
        ↓
Validación local (mínimo 6 caracteres)
        ↓
POST /api/usuarios
        ↓
Servidor: Inserta usuario, genera código, envía email
        ↓
Response: { status: 200, mensaje: "Usuario creado" }
        ↓
Cliente: Oculta form, muestra verificación
        ↓
Sección de Verificación aparece
        ↓
Usuario obtiene código del email
        ↓
Usuario ingresa código
        ↓
Click "VERIFICAR"
        ↓
POST /api/verificar
        ↓
Servidor: Verifica código, actualiza BD
        ↓
Response: { status: 200, mensaje: "OK" }
        ↓
Cliente: Alert "Cuenta verificada"
        ↓
Recarga de página
        ↓
Login con email y contraseña
        ↓
✅ Acceso al Dashboard
```

---

**¡Gracias por usar este sistema! Si tienes más dudas, revisa la documentación adicional:**
- `SOLUCION_REGISTRO.md` - Guía completa
- `DEBUG_REGISTRO.md` - Guía de depuración
- `TEST_REGISTRO.md` - Información de tests

