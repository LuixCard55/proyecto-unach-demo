```
╔════════════════════════════════════════════════════════════════════════════╗
║               FLUJO DE REGISTRO Y VERIFICACIÓN - UNACH SGIAA              ║
╚════════════════════════════════════════════════════════════════════════════╝

┌─ FRONT-END (Navegador) ─────────────────┬─ BACK-END (Servidor) ──────────┐
│                                         │                                 │
│  1. Usuario llena formulario            │                                 │
│     - Nombre                            │                                 │
│     - Correo                            │                                 │
│     - Contraseña                        │                                 │
│     - Rol                               │                                 │
│                                         │                                 │
│  2. Click "CREAR CUENTA"                │                                 │
│     └─ hacerRegistro()                  │                                 │
│        ├─ Validar campos                │                                 │
│        ├─ Trim espacios                 │                                 │
│        ├─ Log: 📝 Intentando registrar  │                                 │
│        └─ POST /api/usuarios ────────────────────> /api/usuarios         │
│                                         │  ├─ Generar código: 123456      │
│                                         │  ├─ Log: ✅ Usuario insertado   │
│                                         │  ├─ Enviar email                │
│                                         │  ├─ Log: 📧 Correo enviado      │
│                                         │  └─ return 200 ───────────────> │
│  3. Recibir respuesta                   │                                 │
│     ├─ Log: 📬 Respuesta del servidor   │                                 │
│     ├─ Check: status 200?               │                                 │
│     ├─ Check: ok: true?                 │                                 │
│     │                                   │                                 │
│     ├─ SI ✅                            │                                 │
│     │  ├─ Ocultar form-registro        │                                 │
│     │  ├─ Mostrar seccion-verificacion │                                 │
│     │  ├─ Log: ✅ Registro exitoso      │                                 │
│     │  ├─ Alert: "¡Código enviado!"    │                                 │
│     │  └─ correoPendiente = correo     │                                 │
│     │                                   │                                 │
│     └─ NO ❌                            │                                 │
│        ├─ Log: ❌ Error en registro     │                                 │
│        └─ Alert: Mostrar error         │                                 │
│                                         │                                 │
│  4. Aparece sección de verificación     │                                 │
│     ┌─────────────────────────────────┐ │                                 │
│     │ Revisa tu bandeja de entrada    │ │                                 │
│     │ [    CÓDIGO     ]                │ │                                 │
│     │ [  VERIFICAR  ]                  │ │                                 │
│     └─────────────────────────────────┘ │                                 │
│                                         │                                 │
│  5. Usuario obtiene código:             │                                 │
│     ├─ Opción A: Del email             │                                 │
│     └─ Opción B: De la BD (phpMyAdmin) │                                 │
│                                         │                                 │
│  6. Ingresa código (6 dígitos)          │                                 │
│     └─ Click "VERIFICAR"                │                                 │
│        └─ verificarCodigo()             │                                 │
│           ├─ Validar código 6 dígitos   │                                 │
│           ├─ Log: 🔐 Verificando       │                                 │
│           └─ POST /api/verificar ───────────────> /api/verificar         │
│                                         │  ├─ Select donde código = ...   │
│                                         │  ├─ Check: ¿Existe?             │
│                                         │  │                              │
│                                         │  ├─ SI ✅                       │
│                                         │  │  ├─ Update es_verificado=1   │
│                                         │  │  ├─ Log: ✅ Usuario verificado
│                                         │  │  └─ return 200              │
│                                         │  │                              │
│                                         │  └─ NO ❌                       │
│                                         │     ├─ Log: ❌ Código incorrecto
│                                         │     └─ return 400              │
│                                         │                                 │
│  7. Recibir respuesta                   │                                 │
│     ├─ Log: 📬 Respuesta verificación   │                                 │
│     │                                   │                                 │
│     ├─ SI ✅ (status 200, ok: true)    │                                 │
│     │  ├─ Log: ✅ Código verificado    │                                 │
│     │  ├─ Alert: "Cuenta verificada"   │                                 │
│     │  └─ Recarga página               │                                 │
│     │                                   │                                 │
│     └─ NO ❌                            │                                 │
│        ├─ Log: ❌ Error en verificación │                                 │
│        └─ Alert: "Código incorrecto"   │                                 │
│                                         │                                 │
│  8. Página recargada - Login            │                                 │
│     ├─ Ingresa email                   │                                 │
│     ├─ Ingresa contraseña              │                                 │
│     └─ Click "INICIAR SESIÓN"          │                                 │
│        └─ hacerLogin() ─────────────────────> /api/login                │
│                                         │  ├─ Select usuario             │
│                                         │  ├─ Check: es_verificado=1?    │
│                                         │  │                              │
│                                         │  ├─ SI ✅                       │
│                                         │  │  ├─ Log: Login exitoso       │
│                                         │  │  └─ return 200              │
│                                         │  │                              │
│                                         │  └─ NO ❌                       │
│                                         │     ├─ Log: Cuenta no verificada
│                                         │     └─ return 401              │
│                                         │                                 │
│  9. Acceso al Dashboard                 │                                 │
│     ├─ localStorage: usuario_rol       │                                 │
│     ├─ localStorage: usuario_id        │                                 │
│     ├─ localStorage: usuario_nombre    │                                 │
│     └─ Redirige a dashboard.html       │                                 │
│                                         │                                 │
│  ✅ USUARIO AUTENTICADO Y VERIFICADO   │                                 │
└─────────────────────────────────────────┴─────────────────────────────────┘


╔════════════════════════════════════════════════════════════════════════════╗
║                    TABLA DE BASES DE DATOS RELEVANTE                      ║
╚════════════════════════════════════════════════════════════════════════════╝

TABLA: usuarios

┌────┬──────────────┬──────────────────┬──────────┬──────────────────────┬─────────┐
│ id │ nombre       │ correo           │ password │ codigo_verificacion  │es_verif.│
├────┼──────────────┼──────────────────┼──────────┼──────────────────────┼─────────┤
│ 1  │ Juan Pérez   │ juan@example.com │ 123456   │ 456789               │ 0       │
│    │              │                  │          │ (6 dígitos aleatorios│ (no ver)│
│    │              │                  │          │  enviados al correo) │ (ificado)
├────┼──────────────┼──────────────────┼──────────┼──────────────────────┼─────────┤
│ 2  │ María López  │ maria@example.com│ abcd123  │ NULL                 │ 1       │
│    │              │                  │          │ (después de verificar│ (verifi)│
│    │              │                  │          │  el código se limpia)│ (cado)  │
└────┴──────────────┴──────────────────┴──────────┴──────────────────────┴─────────┘

ESTADOS:
- es_verificado = 0 : Código pendiente de verificar (no puede login)
- es_verificado = 1 : Verificado (puede login)


╔════════════════════════════════════════════════════════════════════════════╗
║                         EMAILS GENERADOS                                  ║
╚════════════════════════════════════════════════════════════════════════════╝

ASUNTO: Código de Verificación

CONTENIDO:
┌─────────────────────────────────────┐
│ Tu código es: 123456                │
└─────────────────────────────────────┘

GENERADO POR: server.js
ENVIADO A: El correo del usuario registrado
FORMATO: Email HTML con código en estilo azul (#002a50)


╔════════════════════════════════════════════════════════════════════════════╗
║                       LOGS EN CONSOLA (F12)                               ║
╚════════════════════════════════════════════════════════════════════════════╝

REGISTRO:
┌─────────────────────────────────────────────────────────────────┐
│ 📝 Intentando registrar: {                                       │
│   nombre: "Juan Pérez",                                         │
│   correo: "juan@example.com",                                   │
│   password: "123456",                                           │
│   rol: "estudiante"                                             │
│ }                                                               │
│                                                                 │
│ 📬 Respuesta del servidor: {                                    │
│   status: 200,                                                  │
│   ok: true,                                                     │
│   data: {                                                       │
│     mensaje: "Usuario creado. Revisa tu correo para verificar." │
│   }                                                             │
│ }                                                               │
│                                                                 │
│ ✅ Registro exitoso, mostrando verificación                     │
└─────────────────────────────────────────────────────────────────┘

VERIFICACIÓN:
┌─────────────────────────────────────────────────────────────────┐
│ 🔐 Verificando código: {                                        │
│   correo: "juan@example.com",                                   │
│   codigo: "123456"                                              │
│ }                                                               │
│                                                                 │
│ 📬 Respuesta de verificación: {                                 │
│   status: 200,                                                  │
│   data: { mensaje: "OK" }                                       │
│ }                                                               │
│                                                                 │
│ ✅ Código verificado correctamente                              │
└─────────────────────────────────────────────────────────────────┘

ELEMENTOS VISUALES:
📝 = Acción de usuario
📬 = Respuesta del servidor
✅ = Éxito
❌ = Error
🔐 = Verificación
📧 = Email
📌 = Nota importante


╔════════════════════════════════════════════════════════════════════════════╗
║                         PUNTOS DE VALIDACIÓN                              ║
╚════════════════════════════════════════════════════════════════════════════╝

VALIDACIÓN EN CLIENTE:
  ✓ Nombre no vacío
  ✓ Correo válido (HTML5)
  ✓ Contraseña mínimo 6 caracteres
  ✓ Rol seleccionado
  ✓ Código de 6 dígitos exactamente
  ✓ No tiene espacios en blanco

VALIDACIÓN EN SERVIDOR:
  ✓ Todos los campos obligatorios presentes
  ✓ Correo único (no duplicado)
  ✓ Código coincide con el almacenado
  ✓ Usuario no verificado previamente
  ✓ Email enviable (Nodemailer)

VALIDACIÓN EN LOGIN:
  ✓ Usuario existe
  ✓ Contraseña correcta
  ✓ es_verificado = 1


╔════════════════════════════════════════════════════════════════════════════╗
║                      CASOS DE ERROR POSIBLES                              ║
╚════════════════════════════════════════════════════════════════════════════╝

ERROR: "Este correo ya está registrado"
  CAUSA: Correo duplicado en BD
  SOLUCIÓN: Usa otro correo o elimina registro anterior

ERROR: "Faltan datos obligatorios"
  CAUSA: Campo vacío
  SOLUCIÓN: Completa todos los campos

ERROR: "Error de conexión"
  CAUSA: Servidor no está ejecutándose
  SOLUCIÓN: node server.js

ERROR: "Código incorrecto"
  CAUSA: Código no coincide
  SOLUCIÓN: Copia exactamente del email o BD

ERROR: "Cuenta no verificada"
  CAUSA: es_verificado = 0 en BD
  SOLUCIÓN: Verifica el código primero


╔════════════════════════════════════════════════════════════════════════════╗
║                           STATUS CODES HTTP                               ║
╚════════════════════════════════════════════════════════════════════════════╝

200 OK                 ✅ Operación exitosa
400 Bad Request        ❌ Datos inválidos (correo duplicado, código incorrecto)
401 Unauthorized       ❌ No autorizado (cuenta no verificada)
500 Internal Error     ❌ Error en servidor (BD)


═══════════════════════════════════════════════════════════════════════════════
```

## Leyenda de Símbolos

| Símbolo | Significado |
|---------|------------|
| ✅ | Éxito, operación correcta |
| ❌ | Error, operación fallida |
| → | Envío de datos |
| ← | Recepción de datos |
| ├─ | Ramificación dentro de flujo |
| └─ | Última ramificación |
| SI | Condición verdadera |
| NO | Condición falsa |
| 📝 | Acción de usuario |
| 📬 | Respuesta del servidor |
| 🔐 | Verificación/Seguridad |
| 📧 | Email |

