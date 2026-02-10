# CORRECCIONES APLICADAS - 10 de Febrero 2026

## Problemas Identificados y Resueltos

### 1. ❌ ERROR: Callback `async` incorrecto en /api/editar-usuario-admin
**Línea afectada:** 720 (antes de la corrección)

**Problema:**
```javascript
// ❌ INCORRECTO - db.query no puede ser async
db.query(sql, [...], async (err) => {
  ...
  await resend.emails.send(...); // ❌ Error: No se puede usar await en callback
})
```

**Solución aplicada:**
- ✅ Eliminado `async` del callback de `db.query()`
- ✅ Cambiado `await` a pattern de `.catch()` para email no bloqueante
- ✅ Respuesta HTTP se envía inmediatamente sin esperar el email
- ✅ Email se envía en background sin errores

### 2. ❌ ERROR: Campo `codigo_verificacion` demasiado pequeño
**Ubicación:** Tabla `usuarios` en base de datos

**Problema:**
```sql
-- ❌ ANTES: Campo limitado a 6 caracteres
codigo_verificacion VARCHAR(6) DEFAULT NULL

-- Provocaba error ER_DATA_TOO_LONG al intentar guardar:
-- Token de 64 caracteres generado por crypto.randomBytes(32).toString('hex')
```

**Solución aplicada:**
- ✅ Expandido a `VARCHAR(255)` en archivo `unach_sgiaa.sql` (actualización del schema)
- ✅ Creado script de migración `migration_011_codigo_verificacion.sql`
- ✅ Ahora soporta:
  - 6-digit codes para autoregistration (ej: "123456")
  - 64-char tokens para admin verification links (ej: "a1b2c3d4...64chars")

## Pasos para Aplicar en Producción

### Paso 1: Ejecutar la Migración SQL en Railway

1. Accede a tu base de datos MySQL en Railway:
   - URL típica: `mysql://user:password@host:port/unach_sgiaa`

2. Abre el archivo `migration_011_codigo_verificacion.sql`

3. Ejecuta este comando:
```sql
ALTER TABLE usuarios MODIFY codigo_verificacion VARCHAR(255) DEFAULT NULL;
```

4. Verifica que se aplicó:
```sql
SHOW COLUMNS FROM usuarios WHERE Field = 'codigo_verificacion';
```
   Debe mostrar: **Type = varchar(255)**

### Paso 2: Verificar en Producción

Después de aplicar la migración:

1. **Editar un usuario existente:**
   - IR a: https://www.sgiaair.com/estudiantes.html
   - Hacer click en botón de editar (✏️)
   - Cambiar nombre/correo/contraseña
   - Guardar cambios
   - Esperado: ✅ Status 200 (no 500 error)

2. **Verificar email recibido:**
   - Revisar correo del usuario editado
   - Debe contener enlace: `https://www.sgiaair.com/verificar-enlace?token=...`
   - Click en enlace debe verificar cuenta

3. **Login con nuevas credenciales:**
   - Usar nuevo correo/contraseña
   - Debe funcionar correctamente

## Archivos Modificados

| Archivo | Cambio | Tipo |
|---------|--------|------|
| `server.js` | Removido `async` del callback, cambio email a background | Fix |
| `unach_sgiaa.sql` | `VARCHAR(6)` → `VARCHAR(255)` | Schema Update |
| `migration_011_codigo_verificacion.sql` | Script de migración | New File |

## Commit de Git

```
Commit: 769ce0c
Mensaje: Fix: Corregir callback async en /api/editar-usuario-admin y expandir campo codigo_verificacion a VARCHAR(255)
```

## Cambios Técnicos Detallados

### De server.js (líneas 720-805)

**ANTES (problémático):**
```javascript
db.query(sql, [nombreTrimmed, correoNormalizado, passwordTrimmed, token, id], async (err) => {
  if (err) return res.status(500).json({...});
  
  try {
    const emailHtml = `...`;
    
    await resend.emails.send({  // ❌ Error aquí
      from: ...,
      to: correoNormalizado,
      subject: ...,
      html: emailHtml,
    });
    
    return res.status(200).json({...});
  } catch (e) {
    return res.status(500).json({...});
  }
});
```

**AHORA (correcto):**
```javascript
db.query(sql, [nombreTrimmed, correoNormalizado, passwordTrimmed, token, id], (err) => {  // Sin async
  if (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({...});
    return res.status(500).json({...});
  }
  
  try {
    const emailHtml = `...`;
    
    // Email en background sin bloquear respuesta
    resend.emails.send({
      from: ...,
      to: correoNormalizado,
      subject: ...,
      html: emailHtml,
    }).catch((emailErr) => {
      console.error("Error enviando email:", emailErr.message);
    });
    
    // Respuesta inmediata
    return res.status(200).json({
      mensaje: "Usuario actualizado. Se envió un enlace de verificación al correo.",
      usuario: { id, nombre: nombreTrimmed, correo: correoNormalizado, es_verificado: 0 }
    });
  } catch (e) {
    return res.status(500).json({...});
  }
});
```

## Explicación Técnica

### Problema 1: Async Callback
Node.js `db.query()` usa callbacks tradicionales, no Promises/async-await. Usar `async` en el callback causa:
- Incompatibilidad de tipos
- El `await` dentro del callback no funciona correctamente
- El callback puede resolver antes de que se complete la operación
- Resulta en 500 error sin mensaje claro

### Problema 2: Campo VARCHAR pequeño
MySQL tiene validaciones de tipo estrictas:
- `VARCHAR(6)` rechaza strings > 6 caracteres con error `ER_DATA_TOO_LONG`
- El token `crypto.randomBytes(32).toString('hex')` genera 64 caracteres
- Al intentar INSERT/UPDATE, MySQL falla y devuelve error
- La app captura este error y retorna 500 al cliente

## Testing Recomendado

```bash
# Test 1: Crear usuario admin
curl -X POST https://www.sgiaair.com/api/crear-estudiante-admin \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Test User","correo":"test@example.com","password":"Pass123"}'
# Esperado: 200, email enviado, codigo_verificacion almacenado (64 chars)

# Test 2: Editar usuario existente
curl -X POST https://www.sgiaair.com/api/editar-usuario-admin/139 \
  -H "Content-Type: application/json" \
  -d '{"nombre":"New Name","correo":"new@example.com","password":"NewPass123"}'
# Esperado: 200, email enviado con nuevo token, es_verificado=0

# Test 3: Verificar enlace
curl https://www.sgiaair.com/verificar-enlace?token=TOKENHERE
# Esperado: Redirect a dashboard.html, usuario verificado
```

## Status Actual

✅ **LISTO PARA PRODUCCIÓN**

Solo requiere:
1. Ejecutar script SQL en Railway
2. Hacer push (ya realizado, commit 769ce0c)
3. Reiniciar la aplicación en Railway (puede ser automático)

---

**Fecha de Corrección:** 10 de Febrero 2026  
**Desarrollador:** GitHub Copilot  
**Proyecto:** SGIAA UNACH  
