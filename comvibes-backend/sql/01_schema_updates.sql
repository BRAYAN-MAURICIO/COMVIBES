-- ======================================================
-- 01_schema_updates.sql
-- Ajustes sobre combives_db para que coincida con lo que
-- el frontend React (Contexts) necesita.
-- Ejecutar DESPUÉS de Comvibes_bas_actualizado.sql
-- ======================================================

USE combives_db;

-- ------------------------------------------------------
-- direcciones: faltaban etiqueta, telefono y predeterminada
-- ------------------------------------------------------
ALTER TABLE direcciones
    ADD COLUMN etiqueta VARCHAR(50) NULL AFTER idUsu,
    ADD COLUMN telefono VARCHAR(20) NULL AFTER ciudad,
    ADD COLUMN departamento VARCHAR(100) NULL AFTER ciudad,
    ADD COLUMN predeterminada BOOLEAN DEFAULT FALSE AFTER telefono;

-- ------------------------------------------------------
-- envios: renombrar empresa_envio -> transportadora y
-- agregar numero_guia y fecha_estimada
-- ------------------------------------------------------
ALTER TABLE envios
    CHANGE COLUMN empresa_envio transportadora VARCHAR(100),
    ADD COLUMN numero_guia VARCHAR(50) NULL AFTER transportadora,
    ADD COLUMN fecha_estimada DATE NULL AFTER fecha_envio;

-- ------------------------------------------------------
-- proveedores: faltaba categoria
-- ------------------------------------------------------
ALTER TABLE proveedores
    ADD COLUMN categoria VARCHAR(100) NULL AFTER nombre;

-- ------------------------------------------------------
-- notificaciones: faltaban tipo y link (la campanita del
-- navbar los necesita para el ícono y para navegar al clic)
-- ------------------------------------------------------
ALTER TABLE notificaciones
    ADD COLUMN tipo ENUM('pedido', 'soporte') NOT NULL DEFAULT 'pedido' AFTER idUsu,
    ADD COLUMN link VARCHAR(255) NULL AFTER mensaje,
    ADD COLUMN leida BOOLEAN DEFAULT FALSE AFTER estado;

-- (No se necesita ningún ALTER en soporte.estado: el enum original ya
-- traía 'Abierto' / 'En Progreso' / 'Cerrado', que es justo lo que usa
-- el frontend. Una migración anterior lo cambiaba a 'Resuelto' por error
-- — se revirtió, junto con soporte.controller.js y SupportContext.jsx.)

-- ------------------------------------------------------
-- facturas: faltaba numero_factura (el frontend lo usa como
-- "FAC-000001" en la vista imprimible /factura/:idPed)
-- ------------------------------------------------------
ALTER TABLE facturas
    ADD COLUMN numero_factura VARCHAR(20) NULL AFTER idPed;

-- ------------------------------------------------------
-- lista_deseos: no existía en el SQL real. El frontend
-- tenía el wishlist solo en localStorage, sin dueño.
-- ------------------------------------------------------
CREATE TABLE IF NOT EXISTS lista_deseos (
    idDeseo INT AUTO_INCREMENT PRIMARY KEY,
    idUsu INT NOT NULL,
    idPro INT NOT NULL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_usuario_producto (idUsu, idPro),
    FOREIGN KEY (idUsu) REFERENCES usuarios(idUsu) ON DELETE CASCADE,
    FOREIGN KEY (idPro) REFERENCES productos(idPro) ON DELETE CASCADE
);

-- ------------------------------------------------------
-- direcciones existentes: marcar la primera de cada usuario
-- como predeterminada, para no dejar a nadie sin una.
-- ------------------------------------------------------
UPDATE direcciones d
JOIN (
    SELECT MIN(idDir) AS idDir
    FROM direcciones
    GROUP BY idUsu
) primera ON primera.idDir = d.idDir
SET d.predeterminada = TRUE;

SHOW TABLES;

-- ------------------------------------------------------
-- proveedores: datos de ejemplo para que el admin tenga
-- registros con los que relacionar los productos.
-- Se usa INSERT IGNORE para que no falle si ya existen.
-- ------------------------------------------------------
INSERT IGNORE INTO proveedores (idProv, nombre, categoria, contacto, telefono, correo, ciudad, pais) VALUES
(1, 'ComVibes Leather Co.', 'Bolsos y Carteras', 'Juan Peña', '6018001234', 'ventas@comvibesleather.com', 'Bogotá', 'Colombia'),
(2, 'TimeStyle International', 'Accesorios', 'Ana Torres', '6017005678', 'info@timestyleco.com', 'Medellín', 'Colombia'),
(3, 'UrbanCap S.A.S', 'Accesorios', 'Luis Gómez', '6016009012', 'pedidos@urbancap.co', 'Cali', 'Colombia'),
(4, 'GoldTouch Joyería', 'Accesorios', 'María Ruiz', '6013002345', 'contacto@goldtouch.com.co', 'Neiva', 'Colombia'),
(5, 'TrailPack Ltda.', 'Bolsos y Carteras', 'Carlos Díaz', '6012006789', 'ventas@trailpack.co', 'Bucaramanga', 'Colombia'),
(6, 'StreetWalk Calzado', 'Calzado', 'Paula Mora', '6011000123', 'info@streetwalk.co', 'Barranquilla', 'Colombia'),
(7, 'DenimCo Industries', 'Ropa Casual', 'Ricardo Vega', '6014004567', 'ventas@deniminco.com', 'Manizales', 'Colombia');

-- Relacionar los productos originales con sus proveedores
UPDATE productos SET idProv = 1 WHERE idPro IN (1, 5, 9); -- ComVibes Leather
UPDATE productos SET idProv = 2 WHERE idPro = 2;           -- TimeStyle
UPDATE productos SET idProv = 3 WHERE idPro = 3;           -- UrbanCap
UPDATE productos SET idProv = 4 WHERE idPro = 4;           -- GoldTouch
UPDATE productos SET idProv = 5 WHERE idPro = 6;           -- TrailPack
UPDATE productos SET idProv = 2 WHERE idPro = 7;           -- SunVibe → TimeStyle
UPDATE productos SET idProv = 6 WHERE idPro = 8;           -- StreetWalk
UPDATE productos SET idProv = 7 WHERE idPro IN (10, 11);   -- DenimCo / BasicWear

-- ------------------------------------------------------
-- Tabla para códigos de recuperación de contraseña.
-- Permite hacer el flujo real sin un servicio de correo:
-- el código se puede mostrar en la respuesta del endpoint
-- (modo demo) o enviarse por email si se agrega Nodemailer.
-- ------------------------------------------------------
CREATE TABLE IF NOT EXISTS password_resets (
    idReset INT AUTO_INCREMENT PRIMARY KEY,
    idUsu INT NOT NULL,
    codigo VARCHAR(6) NOT NULL,
    expira_en DATETIME NOT NULL,
    usado BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (idUsu) REFERENCES usuarios(idUsu) ON DELETE CASCADE
);

-- ------------------------------------------------------
-- soporte: permite tickets de invitados (sin cuenta). Antes
-- POST /api/soporte exigía sesión, lo que era una barrera
-- para reportar un problema. idUsu ya era NULL-able; solo
-- faltaban columnas para guardar el nombre/correo de quien
-- no tiene cuenta.
-- ------------------------------------------------------
ALTER TABLE soporte
    ADD COLUMN guest_nombre VARCHAR(150) AFTER idUsu,
    ADD COLUMN guest_correo VARCHAR(150) AFTER guest_nombre;


-- FIX #6: columna para invalidar tokens JWT emitidos antes del último cambio
-- de contraseña. requireAuth compara iat del token contra este timestamp.
-- Si la columna ya existe (por una migración previa), el IF NOT EXISTS la ignora.
ALTER TABLE credencial
  ADD COLUMN IF NOT EXISTS password_changed_at DATETIME NULL DEFAULT NULL;
