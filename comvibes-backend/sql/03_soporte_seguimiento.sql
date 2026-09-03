-- ======================================================
-- 03_soporte_seguimiento.sql
-- Seguimiento de PQR:
--   · Se registra QUIÉN atendió el ticket y CUÁNDO respondió.
--   · fecha_respuesta (se respondió) queda separada de
--     fecha_resolucion (se cerró): responder ya no cierra el
--     ticket, lo deja En Progreso hasta que alguien lo cierre.
--
-- Ejecutar:
--   mysql -u root -p combives_db < sql/03_soporte_seguimiento.sql
-- o pegándolo completo en la pestaña SQL de phpMyAdmin.
--
-- Idempotente y compatible con MySQL 8 y MariaDB.
-- ======================================================

USE combives_db;

-- ------------------------------------------------------
-- 1. soporte.atendido_por — el usuario admin que respondió.
--    ON DELETE SET NULL: si se borra la cuenta del asesor,
--    el ticket sobrevive sin el nombre, no se borra en cascada.
-- ------------------------------------------------------
SET @sql := (SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'soporte'
              AND COLUMN_NAME = 'atendido_por'),
    'SELECT ''soporte.atendido_por ya existía'' AS aviso',
    'ALTER TABLE soporte ADD COLUMN atendido_por INT NULL AFTER estado'
));
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

SET @sql := (SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'soporte'
              AND CONSTRAINT_NAME = 'fk_soporte_atendido_por'),
    'SELECT ''FK fk_soporte_atendido_por ya existía'' AS aviso',
    'ALTER TABLE soporte ADD CONSTRAINT fk_soporte_atendido_por
       FOREIGN KEY (atendido_por) REFERENCES usuarios(idUsu) ON DELETE SET NULL'
));
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- ------------------------------------------------------
-- 2. soporte.fecha_respuesta — cuándo se escribió la respuesta.
--    Distinta de fecha_resolucion, que ahora solo se llena al cerrar.
-- ------------------------------------------------------
SET @sql := (SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'soporte'
              AND COLUMN_NAME = 'fecha_respuesta'),
    'SELECT ''soporte.fecha_respuesta ya existía'' AS aviso',
    'ALTER TABLE soporte ADD COLUMN fecha_respuesta DATETIME NULL AFTER fecha_creacion'
));
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- ------------------------------------------------------
-- 3. Tickets históricos que ya tenían respuesta pero ninguna
--    fecha_respuesta: se les asigna la de resolución, que es
--    lo más cercano al momento real en que se respondieron.
-- ------------------------------------------------------
UPDATE soporte
   SET fecha_respuesta = fecha_resolucion
 WHERE respuesta_admin IS NOT NULL
   AND respuesta_admin <> ''
   AND fecha_respuesta IS NULL
   AND fecha_resolucion IS NOT NULL;

-- ------------------------------------------------------
-- 4. Comprobación: debe dar 2.
-- ------------------------------------------------------
SELECT COUNT(*) AS columnas_nuevas
  FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME = 'soporte'
   AND COLUMN_NAME IN ('atendido_por', 'fecha_respuesta');
