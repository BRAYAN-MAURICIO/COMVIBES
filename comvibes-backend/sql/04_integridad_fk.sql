-- ======================================================
-- 04_integridad_fk.sql
-- Auditoría ISO 2026-09-26, hallazgo H3: el esquema del repositorio
-- no coincidía con el que el código asume. Corrige dos diferencias:
--   · envios.idDir sin ON DELETE SET NULL (pasos 1 a 3)
--   · credencial.password_changed_at inexistente (paso 4)
--
-- El código (direcciones.controller.js y usuarios.controller.js) asume
-- que envios.idDir tiene ON DELETE SET NULL: al borrar una dirección, el
-- pedido conserva su envío pero sin la dirección enlazada. Ningún .sql
-- del repositorio hacía ese cambio, así que en una instalación nueva
-- borrar una dirección usada en un pedido fallaba con 409.
--
-- Ejecutar después de Comvibes_db_final.sql, 02 y 03:
--   mysql -u root -p combives_db < sql/04_integridad_fk.sql
-- o pegándolo completo en la pestaña SQL de phpMyAdmin.
--
-- Idempotente y compatible con MySQL 8 y MariaDB: si la FK ya tiene
-- ON DELETE SET NULL (por ejemplo, porque se cambió a mano), no toca nada.
-- ======================================================

USE combives_db;

-- ------------------------------------------------------
-- 1. Buscar la FK actual de envios.idDir → direcciones
--    que NO tenga ya la regla SET NULL.
-- ------------------------------------------------------
SET @fk := (
  SELECT rc.CONSTRAINT_NAME
    FROM information_schema.REFERENTIAL_CONSTRAINTS rc
    JOIN information_schema.KEY_COLUMN_USAGE k
      ON k.CONSTRAINT_SCHEMA = rc.CONSTRAINT_SCHEMA
     AND k.CONSTRAINT_NAME   = rc.CONSTRAINT_NAME
     AND k.TABLE_NAME        = rc.TABLE_NAME
   WHERE rc.CONSTRAINT_SCHEMA   = DATABASE()
     AND rc.TABLE_NAME          = 'envios'
     AND rc.REFERENCED_TABLE_NAME = 'direcciones'
     AND k.COLUMN_NAME          = 'idDir'
     AND rc.DELETE_RULE        <> 'SET NULL'
   LIMIT 1
);

-- ------------------------------------------------------
-- 2. Si existe, quitarla.
-- ------------------------------------------------------
SET @sql := IF(
  @fk IS NULL,
  'SELECT ''envios.idDir: no hay FK que reemplazar'' AS aviso',
  CONCAT('ALTER TABLE envios DROP FOREIGN KEY `', @fk, '`')
);
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- ------------------------------------------------------
-- 3. Crearla con ON DELETE SET NULL si todavía no hay
--    ninguna FK de envios.idDir con esa regla.
-- ------------------------------------------------------
SET @sql := (SELECT IF(
  EXISTS(
    SELECT 1
      FROM information_schema.REFERENTIAL_CONSTRAINTS rc
      JOIN information_schema.KEY_COLUMN_USAGE k
        ON k.CONSTRAINT_SCHEMA = rc.CONSTRAINT_SCHEMA
       AND k.CONSTRAINT_NAME   = rc.CONSTRAINT_NAME
       AND k.TABLE_NAME        = rc.TABLE_NAME
     WHERE rc.CONSTRAINT_SCHEMA   = DATABASE()
       AND rc.TABLE_NAME          = 'envios'
       AND rc.REFERENCED_TABLE_NAME = 'direcciones'
       AND k.COLUMN_NAME          = 'idDir'
       AND rc.DELETE_RULE         = 'SET NULL'
  ),
  'SELECT ''envios.idDir ya tenía ON DELETE SET NULL'' AS aviso',
  'ALTER TABLE envios ADD CONSTRAINT fk_envios_direccion
     FOREIGN KEY (idDir) REFERENCES direcciones(idDir) ON DELETE SET NULL'
));
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- ------------------------------------------------------
-- 4. credencial.password_changed_at
--    Solo existía en 01_schema_updates.sql, que el README marca como
--    innecesario. Sin esta columna, cambiar o recuperar la contraseña
--    daba error 500 en una instalación nueva, y las sesiones viejas no
--    se invalidaban tras un cambio de contraseña.
-- ------------------------------------------------------
SET @sql := (SELECT IF(
  EXISTS(SELECT 1 FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'credencial'
            AND COLUMN_NAME = 'password_changed_at'),
  'SELECT ''credencial.password_changed_at ya existía'' AS aviso',
  'ALTER TABLE credencial ADD COLUMN password_changed_at DATETIME NULL DEFAULT NULL'
));
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- ------------------------------------------------------
-- 5. Comprobación: debe mostrar una fila con DELETE_RULE = SET NULL.
-- ------------------------------------------------------
SELECT rc.CONSTRAINT_NAME, rc.DELETE_RULE
  FROM information_schema.REFERENTIAL_CONSTRAINTS rc
  JOIN information_schema.KEY_COLUMN_USAGE k
    ON k.CONSTRAINT_SCHEMA = rc.CONSTRAINT_SCHEMA
   AND k.CONSTRAINT_NAME   = rc.CONSTRAINT_NAME
   AND k.TABLE_NAME        = rc.TABLE_NAME
 WHERE rc.CONSTRAINT_SCHEMA   = DATABASE()
   AND rc.TABLE_NAME          = 'envios'
   AND rc.REFERENCED_TABLE_NAME = 'direcciones'
   AND k.COLUMN_NAME          = 'idDir';

-- Nota: pedidos.idUsu y soporte.idUsu se dejan SIN cascada a propósito.
-- Un usuario con pedidos o PQR es historial contable y de atención: no se
-- borra, se bloquea. usuarios.controller.js → deleteUsuario ahora lo
-- explica con un 409 en vez de dejar que la BD lo rechace sin contexto.
