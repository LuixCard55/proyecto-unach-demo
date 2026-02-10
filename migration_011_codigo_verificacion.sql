-- ================================================================
-- MIGRACIÓN: Expandir campo codigo_verificacion para soportar tokens
-- ================================================================
-- Problema: El campo codigo_verificacion estaba limitado a 6 caracteres
-- Pero el endpoint /api/editar-usuario-admin utiliza tokens de 64 caracteres
-- 
-- Solución: Expandir el campo de VARCHAR(6) a VARCHAR(255)
-- ================================================================

-- Verificar estado actual del campo
-- SHOW COLUMNS FROM usuarios WHERE Field = 'codigo_verificacion';

-- Aplicar la migración
ALTER TABLE usuarios MODIFY codigo_verificacion VARCHAR(255) DEFAULT NULL;

-- Verificar que se aplicó correctamente
-- SHOW COLUMNS FROM usuarios WHERE Field = 'codigo_verificacion';

-- Resultado esperado: Debe mostrar Field=codigo_verificacion, Type=varchar(255)
