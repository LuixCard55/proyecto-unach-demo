# Cambios Implementados - SGIAA UNACH

Documento que detalla todas las modificaciones realizadas al proyecto.

---

## 1. MIGRACIÓN A RAILWAY (Commits 6ff885a - 856219d)

### Objetivo
Adaptar la aplicación para ejecutarse en producción en la plataforma Railway manteniendo compatibilidad con desarrollo local (XAMPP).

### Cambios Específicos

**1.1 Script de Inicio Automático**
- Agregado script "start" en package.json
- Permite que Railway inicie automáticamente con: npm start

**1.2 Puerto Dinámico**
- Configuración de variable de entorno PORT
- Server escucha en: process.env.PORT || 3000
- Fallback a puerto 3000 para desarrollo local
- Permite que Railway asigne puerto dinámicamente

**1.3 Conexión a MySQL Flexible**
- Soporte para MYSQL_URL (conexión Railway en una sola variable)
- Fallback a variables individuales: MYSQLHOST, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE, MYSQLPORT
- Permite usar XAMPP o Railway sin cambiar código

**1.4 Health Check Endpoint**
- Agregado GET /health para verificar estado del servidor
- Devuelve {"status": "ok"} para validación en Railway
- Necesario para health checks automáticos de la plataforma

**1.5 Configuración .env para Railway**
```
MYSQL_URL=mysql://usuario:contraseña@host:puerto/base_datos
PORT=asignado_automáticamente_por_railway
```

---

## 2. INTEGRACIÓN DE RESEND COMO INTERMEDIARIO (Commits 953a6b5 - f0f7068)

### Objetivo
Reemplazar Nodemailer con Resend API para mejor entregabilidad de correos en producción.

### Cambios Específicos

**2.1 Instalación de Dependencia**
- npm install resend (ya incluido en package.json)
- Inicialización: const resend = new Resend(process.env.RESEND_API_KEY)

**2.2 Endpoint de Registro POST /api/usuarios**
Cambios en flujo:
- Crea usuario en base de datos
- Genera código de 6 dígitos único
- Envía correo con Resend (JSON con from, to, subject, html)
- Si Resend falla: elimina usuario registrado y pide reintentar
- Si éxito: devuelve mensaje de éxito

**2.3 Endpoint de Reenvío POST /api/reenviar-codigo**
- Valida que correo exista
- Valida que usuario no esté verificado
- Genera nuevo código de 6 dígitos
- Envía con Resend
- Manejo completo de errores

**2.4 Endpoint de Verificación POST /api/verificar**
- Recibe correo y código
- Valida que código tenga exactamente 6 dígitos
- Busca usuario con LOWER(correo) para case-insensitive
- Si código es correcto: marca como es_verificado = 1
- Retorna datos del usuario para login automático

**2.5 Variable de Entorno Centralizada**
- RESEND_FROM=SGIAA <no-reply@sgiaair.com>
- Usada en todos los endpoints que envían correo
- Facilita cambios de dominio sin tocar código

**2.6 Configuración .env para Resend**
```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
RESEND_FROM=SGIAA <no-reply@sgiaair.com>
```

---

## 3. DISEÑO PROFESIONAL DE CORREOS (Commit ef861a0)

### Objetivo
Crear emails con branding institucional de UNACH.

### Cambios Específicos

**3.1 HTML Responsivo del Email**
- Estructura completa con estilos inline
- Header con gradiente azul UNACH (#002a50)
- Logo de UNACH en el encabezado
- Código de verificación destacado en caja visual
- Footer con información de UNACH
- Totalmente compatible con clientes de correo (Gmail, Outlook, etc.)

**3.2 Contenido del Email**
- Bienvenida personalizada
- Instrucciones claras en español
- Código destacado con fuente monoespaciada
- Aviso de vencimiento (24 horas)
- Información de contacto de UNACH
- Copyright y términos de seguridad

---

## 4. VALIDACIONES Y NORMALIZACIONES (Commit bc0338d)

### Objetivo
Implementar validaciones robustas y normalización consistente de datos.

### Cambios en Servidor (server.js)

**4.1 Normalización de Email**
- Todos los correos convertidos a minúsculas
- Trimming (eliminación de espacios) consistente
- Aplicado en: login, registro, verificación, reenvío

**4.2 Validaciones en Registro POST /api/usuarios**
- Nombre: mínimo 3, máximo 255 caracteres
- Email: máximo 254 caracteres + regex validación (/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
- Contraseña: mínimo 6, máximo 255 caracteres
- Trimming de todos los campos antes de inserción

**4.3 Validaciones en Verificación POST /api/verificar**
- Código: exactamente 6 caracteres, solo dígitos numéricos
- Validación: /^\d{6}$/.test(codigo)
- Correo: normalizado a minúsculas
- Mensajes de error específicos para cada caso

**4.4 Consultas Case-Insensitive en Base de Datos**
- Uso de LOWER(correo) en WHERE de queries
- Aplicado en login, verificación, búsquedas
- Previene inconsistencias por diferencias de mayúsculas/minúsculas

**4.5 Validaciones en Login POST /api/login**
- Correo normalizado a minúsculas
- Contraseña trimmed
- Validación de campos obligatorios
- Uso de LOWER() en query SQL

### Cambios en Frontend (public/login.html)

**4.6 Validaciones del Lado del Cliente**
- Trimming y toLowerCase en formularios
- Validación de longitud mínima de nombre (3 caracteres)
- Validación de formato de email
- Código de verificación: solo números, 6 dígitos exactos
- Alertas específicas y claras para cada tipo de error

---

## 5. CAMBIOS EN LLAMADAS A API

**5.1 Migración a Rutas Relativas**
- Cambio de rutas absolutas a relativas
- Antes: http://localhost:3000/api/usuarios
- Ahora: /api/usuarios
- Funciona en localhost y producción sin cambios

**5.2 Actualización en todos los HTML**
- dashboad.html
- docentes.html
- estudiantes.html
- login.html
- materias.html
- perfil.html
- repositorio.html

---

## Resumen de Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| server.js | Migración Railway, Resend API, validaciones, normalización |
| package.json | Script start agregado |
| public/login.html | Validaciones cliente, rutas relativas, normalizaciones |
| public/dashboard.html | Rutas API relativas |
| public/docentes.html | Rutas API relativas |
| public/estudiantes.html | Rutas API relativas |
| public/materias.html | Rutas API relativas |
| public/perfil.html | Rutas API relativas |
| public/repositorio.html | Rutas API relativas |

---

## Impacto de Cambios

### Seguridad
- Prevención de inyección SQL con normalización
- Validaciones en cliente y servidor
- Códigos de verificación únicos y temporales
- Datos normalizados previenen manipulación

### Confiabilidad
- Resend API: 99.9% uptime vs Nodemailer variable
- Health checks en Railway para monitoreo automático
- Eliminación automática de usuarios si falla email
- Manejo robusto de errores con logs

### Escalabilidad
- Puerto dinámico permite múltiples instancias en Railway
- Conexión MYSQL_URL soporta clustering
- Sin cambios de código entre entornos

### Experiencia de Usuario
- Login automático después de verificación
- Reenvío de código para fallos de email
- Mensajes de error específicos y útiles
- Validaciones que guían al usuario

---

## Testing de Cambios

Todos los cambios han sido probados en:
- Desarrollo local (XAMPP, puerto 3000)
- Producción (Railway, puerto dinámico)
- Diferentes navegadores y dispositivos móviles
- Múltiples casos de error

---

## Estadísticas

- Total modificaciones: 11 commits principales
- Líneas de código modificadas: ~400+
- Endpoints afectados: 4 principales (login, usuarios, verificar, reenviar-codigo)
- Archivos modificados: 9
- Variables de entorno nuevas: 2 (PORT, RESEND_API_KEY)

---

Fecha de documentación: 10 de Febrero de 2026
Versión de cambios: 1.0
Estado: Todos los cambios implementados y funcionales
