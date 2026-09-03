-- ======================================================
-- 02_email_real.sql
-- Reemplaza la simulación de correo por el flujo real:
--   1. Verificación obligatoria de correo al registrarse
--   2. Código de recuperación guardado como hash (nunca en claro)
--
-- Ejecutar DESPUÉS de cargar la base:
--   mysql -u root -p combives_db < sql/02_email_real.sql
-- o pegándolo completo en la pestaña SQL de phpMyAdmin.
--
-- Es idempotente (se puede correr varias veces) y compatible
-- con MySQL 8 y MariaDB: cada columna se agrega solo si falta,
-- consultando information_schema. No usa DELIMITER ni
-- "ADD COLUMN IF NOT EXISTS" (que MySQL 8 no soporta).
-- ======================================================

USE combives_db;

-- ------------------------------------------------------
-- 1. credencial.correo_verificado
--    Mientras sea FALSE el login responde 403 y el frontend
--    manda al usuario a /verificar-correo.
-- ------------------------------------------------------
SET @sql := (SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'credencial'
              AND COLUMN_NAME = 'correo_verificado'),
    'SELECT ''credencial.correo_verificado ya existía'' AS aviso',
    'ALTER TABLE credencial ADD COLUMN correo_verificado BOOLEAN NOT NULL DEFAULT FALSE AFTER estado'
));
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- ------------------------------------------------------
-- 2. credencial.fecha_verificacion
-- ------------------------------------------------------
SET @sql := (SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'credencial'
              AND COLUMN_NAME = 'fecha_verificacion'),
    'SELECT ''credencial.fecha_verificacion ya existía'' AS aviso',
    'ALTER TABLE credencial ADD COLUMN fecha_verificacion DATETIME NULL DEFAULT NULL AFTER correo_verificado'
));
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- ------------------------------------------------------
-- 3. Códigos de verificación de correo (registro).
--    Se guarda SOLO el hash bcrypt del código de 6 dígitos:
--    leer la BD no permite activar cuentas ajenas.
--    'intentos' corta el fuerza-bruta sobre un código concreto.
-- ------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_verifications (
    idVer       INT AUTO_INCREMENT PRIMARY KEY,
    idUsu       INT          NOT NULL,
    codigo_hash VARCHAR(255) NOT NULL,
    expira_en   DATETIME     NOT NULL,
    usado       BOOLEAN      DEFAULT FALSE,
    intentos    TINYINT      NOT NULL DEFAULT 0,
    creado_en   DATETIME     DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ver_usu (idUsu),
    FOREIGN KEY (idUsu) REFERENCES usuarios(idUsu) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------
-- 4. password_resets.codigo_hash
--    El código ya no se guarda en texto plano ni se devuelve
--    en la respuesta HTTP: viaja por correo y aquí queda su hash.
-- ------------------------------------------------------
SET @sql := (SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'password_resets'
              AND COLUMN_NAME = 'codigo_hash'),
    'SELECT ''password_resets.codigo_hash ya existía'' AS aviso',
    'ALTER TABLE password_resets ADD COLUMN codigo_hash VARCHAR(255) NULL AFTER codigo'
));
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- ------------------------------------------------------
-- 5. password_resets.intentos
-- ------------------------------------------------------
SET @sql := (SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'password_resets'
              AND COLUMN_NAME = 'intentos'),
    'SELECT ''password_resets.intentos ya existía'' AS aviso',
    'ALTER TABLE password_resets ADD COLUMN intentos TINYINT NOT NULL DEFAULT 0'
));
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- ------------------------------------------------------
-- 6. password_resets.creado_en
-- ------------------------------------------------------
SET @sql := (SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'password_resets'
              AND COLUMN_NAME = 'creado_en'),
    'SELECT ''password_resets.creado_en ya existía'' AS aviso',
    'ALTER TABLE password_resets ADD COLUMN creado_en DATETIME DEFAULT CURRENT_TIMESTAMP'
));
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- La columna vieja 'codigo' pasa a NULL-able: el controlador ya no la escribe.
-- Se deja para no romper filas históricas; se puede borrar más adelante con
--   ALTER TABLE password_resets DROP COLUMN codigo;
ALTER TABLE password_resets MODIFY COLUMN codigo VARCHAR(6) NULL;

-- Invalidar cualquier código viejo que quedara guardado en claro.
UPDATE password_resets SET usado = TRUE WHERE usado = FALSE;

-- ------------------------------------------------------
-- 7. Cuentas que ya existían (admin, cliente de prueba y los
--    usuarios creados antes de esta migración) se dan por
--    verificadas: de lo contrario nadie podría volver a entrar.
-- ------------------------------------------------------
UPDATE credencial
   SET correo_verificado  = TRUE,
       fecha_verificacion = NOW()
 WHERE correo_verificado = FALSE;

-- ------------------------------------------------------
-- 8. Comprobación final.
--    'columnas_nuevas' debe dar 3 y 'tabla_verificaciones' debe dar 1.
--    Si alguno da 0, la migración NO se aplicó.
-- ------------------------------------------------------
SELECT
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND ((TABLE_NAME = 'credencial'      AND COLUMN_NAME IN ('correo_verificado','fecha_verificacion'))
          OR (TABLE_NAME = 'password_resets' AND COLUMN_NAME = 'codigo_hash'))
    ) AS columnas_nuevas,
    (SELECT COUNT(*) FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'email_verifications'
    ) AS tabla_verificaciones;

SELECT correo, correo_verificado FROM credencial;
