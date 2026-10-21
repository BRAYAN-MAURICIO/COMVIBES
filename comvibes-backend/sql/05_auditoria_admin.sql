-- ======================================================
-- 05_auditoria_admin.sql
-- Auditoría ISO 2026-09-26, hallazgo H12 (ISO/IEC 27001 A.8.15).
-- Bitácora de acciones administrativas: quién hizo qué, sobre qué
-- registro, cuándo, desde qué IP, y el valor antes y después.
--
-- La escribe src/utils/auditoria.js; la lee GET /api/auditoria (solo admin).
--
-- Ejecutar después de las migraciones 02, 03 y 04:
--   mysql -u root -p combives_db < sql/05_auditoria_admin.sql
-- o abriéndolo en MySQL Workbench y ejecutándolo completo (⚡).
--
-- Idempotente y compatible con MySQL 8/9 y MariaDB.
-- ======================================================

USE combives_db;

CREATE TABLE IF NOT EXISTS auditoria_admin (
    idAud       INT AUTO_INCREMENT PRIMARY KEY,
    -- Quién: el admin autenticado. SET NULL para que borrar la cuenta del
    -- admin no borre su rastro (se pierde el nombre, no el hecho).
    idUsu       INT NULL,
    -- Qué: 'pedido.estado', 'usuario.rol', 'producto.precio', ...
    accion      VARCHAR(50)  NOT NULL,
    entidad     VARCHAR(30)  NOT NULL,
    id_entidad  INT          NULL,
    -- Valor antes y después, en JSON: {"antes": {...}, "despues": {...}}
    detalle     TEXT         NULL,
    ip          VARCHAR(45)  NULL,
    fecha       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_aud_fecha   (fecha),
    INDEX idx_aud_entidad (entidad, id_entidad),
    CONSTRAINT fk_auditoria_usuario
      FOREIGN KEY (idUsu) REFERENCES usuarios(idUsu) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Comprobación: debe dar 1.
SELECT COUNT(*) AS tabla_auditoria
  FROM information_schema.TABLES
 WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME = 'auditoria_admin';
