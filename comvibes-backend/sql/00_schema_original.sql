DROP DATABASE IF EXISTS combives_db;
CREATE DATABASE combives_db;
USE combives_db;

-- ======================================================
-- TABLAS PRINCIPALES
-- ======================================================

CREATE TABLE usuarios (
    idUsu INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    fecha_nacimiento DATE,
    genero ENUM('Masculino', 'Femenino', 'Otro', 'Prefiero no decir'),
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    documento_id VARCHAR(20) UNIQUE
);

CREATE TABLE roles (
    idRol INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL,
    descripcion VARCHAR(150)
);

CREATE TABLE categorias (
    idCat INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(200)
);

CREATE TABLE proveedores (
    idProv INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    contacto VARCHAR(100),
    telefono VARCHAR(20),
    correo VARCHAR(100),
    direccion VARCHAR(255),
    ciudad VARCHAR(100),
    pais VARCHAR(100)
);

-- 🔧 CAMBIO AQUÍ
CREATE TABLE metodospago (
    idMet INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL,
    descripcion VARCHAR(150),
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ======================================================
-- RELACIONES
-- ======================================================

CREATE TABLE usuariorol (
    idUsu INT,
    idRol INT,
    PRIMARY KEY (idUsu, idRol),
    FOREIGN KEY (idUsu) REFERENCES usuarios(idUsu) ON DELETE CASCADE,
    FOREIGN KEY (idRol) REFERENCES roles(idRol) ON DELETE CASCADE
);

CREATE TABLE contacto (
    idCont INT AUTO_INCREMENT PRIMARY KEY,
    idUsu INT,
    telefono VARCHAR(20),
    correo_alternativo VARCHAR(100),
    red_social VARCHAR(50),
    tipo_contacto ENUM('personal', 'laboral', 'emergencia'),
    FOREIGN KEY (idUsu) REFERENCES usuarios(idUsu) ON DELETE CASCADE
);

CREATE TABLE credencial (
    idCred INT AUTO_INCREMENT PRIMARY KEY,
    idUsu INT UNIQUE,
    correo VARCHAR(100) UNIQUE NOT NULL,
    usuario VARCHAR(50) UNIQUE NOT NULL,
    contrasena_hash VARCHAR(255) NOT NULL,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    ultimo_acceso DATETIME,
    estado ENUM('activo', 'inactivo', 'bloqueado') DEFAULT 'activo',
    FOREIGN KEY (idUsu) REFERENCES usuarios(idUsu) ON DELETE CASCADE
);

CREATE TABLE direcciones (
    idDir INT AUTO_INCREMENT PRIMARY KEY,
    idUsu INT,
    direccion VARCHAR(255) NOT NULL,
    ciudad VARCHAR(100) NOT NULL,
    pais VARCHAR(100) NOT NULL,
    codigo_postal VARCHAR(20),
    FOREIGN KEY (idUsu) REFERENCES usuarios(idUsu) ON DELETE CASCADE
);

-- 🔧 CAMBIO AQUÍ
CREATE TABLE productos (
    idPro INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10,2) NOT NULL,
    fecha_agregado DATETIME DEFAULT CURRENT_TIMESTAMP,
    idProv INT,
    idCat INT,
    imagen_url VARCHAR(255),
    activo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (idProv) REFERENCES proveedores(idProv),
    FOREIGN KEY (idCat) REFERENCES categorias(idCat)
);

CREATE TABLE inventario (
    idInv INT AUTO_INCREMENT PRIMARY KEY,
    idPro INT UNIQUE,
    cantidad_disp INT NOT NULL DEFAULT 0,
    ubicacion VARCHAR(100),
    ultima_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (idPro) REFERENCES productos(idPro) ON DELETE CASCADE
);

CREATE TABLE carrito (
    idCar INT AUTO_INCREMENT PRIMARY KEY,
    idUsu INT UNIQUE,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (idUsu) REFERENCES usuarios(idUsu) ON DELETE CASCADE
);

CREATE TABLE detallecarrito (
    idDetCar INT AUTO_INCREMENT PRIMARY KEY,
    idCar INT,
    idPro INT,
    cantidad INT NOT NULL,
    precio DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (idCar) REFERENCES carrito(idCar) ON DELETE CASCADE,
    FOREIGN KEY (idPro) REFERENCES productos(idPro)
);

CREATE TABLE pedidos (
    idPed INT AUTO_INCREMENT PRIMARY KEY,
    idUsu INT,
    fecha_pedido DATETIME DEFAULT CURRENT_TIMESTAMP,
    estado ENUM('Pendiente', 'En Camino', 'Entregado', 'Cancelado') DEFAULT 'Pendiente',
    total DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (idUsu) REFERENCES usuarios(idUsu)
);

CREATE TABLE detallepedido (
    idDetPed INT AUTO_INCREMENT PRIMARY KEY,
    idPed INT,
    idPro INT,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (idPed) REFERENCES pedidos(idPed) ON DELETE CASCADE,
    FOREIGN KEY (idPro) REFERENCES productos(idPro)
);

CREATE TABLE pagos (
    idPago INT AUTO_INCREMENT PRIMARY KEY,
    idPed INT UNIQUE,
    idMet INT,
    fecha_pago DATETIME DEFAULT CURRENT_TIMESTAMP,
    monto DECIMAL(10,2) NOT NULL,
    estado ENUM('Pendiente', 'Completado', 'Fallido', 'Reembolsado') DEFAULT 'Pendiente',
    transaccion_id VARCHAR(100),
    FOREIGN KEY (idPed) REFERENCES pedidos(idPed),
    FOREIGN KEY (idMet) REFERENCES metodospago(idMet)
);

CREATE TABLE envios (
    idEnv INT AUTO_INCREMENT PRIMARY KEY,
    idPed INT UNIQUE,
    idDir INT,
    empresa_envio VARCHAR(100),
    estado_envio ENUM('Pendiente', 'Enviado', 'En tránsito', 'Entregado', 'Devuelto'),
    fecha_envio DATETIME,
    telefono_contacto VARCHAR(20),
    FOREIGN KEY (idPed) REFERENCES pedidos(idPed),
    FOREIGN KEY (idDir) REFERENCES direcciones(idDir)
);

CREATE TABLE facturas (
    idFac INT AUTO_INCREMENT PRIMARY KEY,
    idPed INT UNIQUE,
    fecha_emision DATETIME DEFAULT CURRENT_TIMESTAMP,
    monto_total DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (idPed) REFERENCES pedidos(idPed)
);

-- ======================================================
-- TABLAS ADICIONALES
-- ======================================================

CREATE TABLE notificaciones (
    idNot INT AUTO_INCREMENT PRIMARY KEY,
    idUsu INT,
    mensaje TEXT NOT NULL,
    fecha_envio DATETIME DEFAULT CURRENT_TIMESTAMP,
    estado ENUM('pendiente', 'enviado', 'leido') DEFAULT 'pendiente',
    FOREIGN KEY (idUsu) REFERENCES usuarios(idUsu) ON DELETE CASCADE
);

CREATE TABLE opiniones (
    idOpi INT AUTO_INCREMENT PRIMARY KEY,
    idPro INT,
    idUsu INT,
    comentario TEXT,
    calificacion INT CHECK (calificacion BETWEEN 1 AND 5),
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (idPro) REFERENCES productos(idPro) ON DELETE CASCADE,
    FOREIGN KEY (idUsu) REFERENCES usuarios(idUsu) ON DELETE CASCADE
);

CREATE TABLE soporte (
    idTick INT AUTO_INCREMENT PRIMARY KEY,
    idUsu INT,
    guest_nombre VARCHAR(150),
    guest_correo VARCHAR(150),
    asunto VARCHAR(150) NOT NULL,
    descripcion TEXT NOT NULL,
    respuesta_admin TEXT,
    estado ENUM('Abierto', 'En Progreso', 'Cerrado') DEFAULT 'Abierto',
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_resolucion DATETIME,
    FOREIGN KEY (idUsu) REFERENCES usuarios(idUsu)
);

CREATE TABLE reportes (
    idRep INT AUTO_INCREMENT PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL,
    contenido TEXT,
    fecha_generacion DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO roles (nombre, descripcion) VALUES 
('admin', 'Administrador del sistema con todos los permisos'),
('cliente', 'Usuario regular que realiza compras');

INSERT INTO usuarios (nombre, apellido, documento_id) VALUES 
('Admin', 'ComVibes', '100000001'),
('Cliente', 'Prueba', '100000002');

-- Placeholders temporales: correr `npm run seed:hash` en el backend, que los
-- reemplaza por contraseñas aleatorias hasheadas (ver comentario en
-- Comvibes_db_final.sql). No son la contraseña real de estas cuentas.
INSERT INTO credencial (idUsu, correo, usuario, contrasena_hash) VALUES 
(1, 'admin@combives.com', 'admin', 'admin123'),
(2, 'cliente@test.com', 'cliente', 'cliente123');

INSERT INTO usuariorol (idUsu, idRol) VALUES 
(1, 1),
(2, 2);

INSERT INTO categorias (nombre, descripcion) VALUES 
('Bolsos y Carteras', 'Todo tipo de bolsos, morrales y carteras'),
('Accesorios', 'Joyas, relojes, billeteras, gorras y sombreros');

INSERT INTO productos (nombre, descripcion, precio, idCat) VALUES 
('Bolso Tote Cuero', 'Bolso tote en cuero genuino color negro', 120000.00, 1),
('Reloj Unisex Vintage', 'Reloj analógico con correa de acero', 85000.00, 2),
('Gorra Deportiva', 'Gorra ajustable color negra con bordado', 35000.00, 2),
('Juego de Joyas (Anillo + Aretes)', 'Joyería en oro rosa', 250000.00, 2),
('Billetera de Cuero', 'Billetera ejecutiva con 7 compartimentos', 45000.00, 2);

INSERT INTO inventario (idPro, cantidad_disp, ubicacion) VALUES 
(1, 10, 'Estante A1'),
(2, 25, 'Vitrina Central'),
(3, 50, 'Estante B3'),
(4, 5, 'Vitrina Exclusiva'),
(5, 30, 'Estante C2');

INSERT INTO pedidos (idUsu, total) VALUES (2, 120000.00);
INSERT INTO detallepedido (idPed, idPro, cantidad, precio_unitario) VALUES (1, 1, 1, 120000.00);
-- ======================================================
-- VERIFICACIÓN
-- ======================================================
SHOW TABLES;
-- ======================================================
-- AMPLIACIÓN DE CATÁLOGO (categorías y productos nuevos)
-- Debe coincidir exactamente con src/mocks/categorias.json
-- y src/mocks/productos.json del frontend.
-- ======================================================

INSERT INTO categorias (nombre, descripcion) VALUES
('Calzado', 'Tenis, sandalias y zapatos para complementar tu estilo'),
('Ropa Casual', 'Chaquetas, camisetas y prendas para el día a día');

INSERT INTO productos (nombre, descripcion, precio, idCat) VALUES
('Mochila Casual Impermeable', 'Mochila urbana resistente al agua con compartimento para portátil', 95000.00, 1),
('Gafas de Sol Retro', 'Gafas de sol con montura redonda y protección UV400', 55000.00, 2),
('Tenis Urbanos Blancos', 'Tenis unisex de lona, suela cómoda para uso diario', 130000.00, 3),
('Sandalias de Cuero', 'Sandalias artesanales en cuero, cómodas y livianas', 60000.00, 3),
('Chaqueta Denim Oversize', 'Chaqueta de jean estilo oversize, unisex', 145000.00, 4),
('Camiseta Básica Algodón', 'Camiseta 100% algodón, disponible en varios colores', 40000.00, 4);

-- idPro se asume consecutivo (6-11) siguiendo el AUTO_INCREMENT ya usado
-- por los 5 productos originales. Ajusta los idPro del INSERT de abajo
-- si tu tabla productos ya tenía otros registros insertados manualmente.
INSERT INTO inventario (idPro, cantidad_disp, ubicacion) VALUES
(6, 18, 'Estante A2'),
(7, 22, 'Vitrina Central'),
(8, 14, 'Estante D1'),
(9, 0, 'Estante D2'),
(10, 9, 'Estante E1'),
(11, 40, 'Estante E2');

SHOW TABLES;

-- ======================================================
-- GALERÍA DE FOTOS POR PRODUCTO
-- Un producto puede tener varias imágenes (tabla aparte,
-- 1 a N respecto a productos). Debe coincidir con el campo
-- 'imagenes' de src/mocks/productos.json del frontend.
-- ======================================================

CREATE TABLE producto_imagenes (
    idImg INT AUTO_INCREMENT PRIMARY KEY,
    idPro INT NOT NULL,
    url VARCHAR(255) NOT NULL,
    orden INT DEFAULT 0,
    FOREIGN KEY (idPro) REFERENCES productos(idPro) ON DELETE CASCADE
);

-- idPro asumido 1-11 en el mismo orden en que se insertaron
-- los productos (5 originales + 6 de la ampliación de catálogo).
-- Ajusta los idPro si tu tabla productos ya tenía otro orden.
INSERT INTO producto_imagenes (idPro, url, orden) VALUES
(1, '/src/assets/img/productos/bolso-tote-cuero.jpg', 1),
(1, '/src/assets/img/productos/bolso-tote-cuero-2.jpg', 2),
(1, '/src/assets/img/productos/bolso-tote-cuero-3.jpg', 3),
(2, '/src/assets/img/productos/reloj-unisex-vintage.jpg', 1),
(2, '/src/assets/img/productos/reloj-unisex-vintage-2.jpg', 2),
(2, '/src/assets/img/productos/reloj-unisex-vintage-3.jpg', 3),
(3, '/src/assets/img/productos/gorra-deportiva.jpg', 1),
(3, '/src/assets/img/productos/gorra-deportiva-2.jpg', 2),
(3, '/src/assets/img/productos/gorra-deportiva-3.jpg', 3),
(4, '/src/assets/img/productos/juego-joyas.jpg', 1),
(4, '/src/assets/img/productos/juego-joyas-2.jpg', 2),
(4, '/src/assets/img/productos/juego-joyas-3.jpg', 3),
(5, '/src/assets/img/productos/billetera-cuero.jpg', 1),
(5, '/src/assets/img/productos/billetera-cuero-2.jpg', 2),
(5, '/src/assets/img/productos/billetera-cuero-3.jpg', 3),
(6, '/src/assets/img/productos/mochila-casual.jpg', 1),
(6, '/src/assets/img/productos/mochila-casual-2.jpg', 2),
(6, '/src/assets/img/productos/mochila-casual-3.jpg', 3),
(7, '/src/assets/img/productos/gafas-sol-retro.jpg', 1),
(7, '/src/assets/img/productos/gafas-sol-retro-2.jpg', 2),
(7, '/src/assets/img/productos/gafas-sol-retro-3.jpg', 3),
(8, '/src/assets/img/productos/tenis-urbanos.jpg', 1),
(8, '/src/assets/img/productos/tenis-urbanos-2.jpg', 2),
(8, '/src/assets/img/productos/tenis-urbanos-3.jpg', 3),
(9, '/src/assets/img/productos/sandalias-cuero.jpg', 1),
(9, '/src/assets/img/productos/sandalias-cuero-2.jpg', 2),
(9, '/src/assets/img/productos/sandalias-cuero-3.jpg', 3),
(10, '/src/assets/img/productos/chaqueta-denim.jpg', 1),
(10, '/src/assets/img/productos/chaqueta-denim-2.jpg', 2),
(10, '/src/assets/img/productos/chaqueta-denim-3.jpg', 3),
(11, '/src/assets/img/productos/camiseta-basica.jpg', 1),
(11, '/src/assets/img/productos/camiseta-basica-2.jpg', 2),
(11, '/src/assets/img/productos/camiseta-basica-3.jpg', 3);

SHOW TABLES;

-- ======================================================
-- CAMPOS DE MARCA, COLOR Y TALLA
-- Pedidos en la entrevista (pregunta 14) y ahora conectados
-- en el frontend. 'talla' queda NULL en categorías donde no
-- aplica (Bolsos y Carteras, Accesorios).
-- ======================================================

ALTER TABLE productos
    ADD COLUMN marca VARCHAR(100) NULL AFTER nombre,
    ADD COLUMN color VARCHAR(50) NULL AFTER precio,
    ADD COLUMN talla VARCHAR(50) NULL AFTER color;

-- idPro asumido 1-11 en el mismo orden de inserción del script
-- completo (5 originales + 6 de la ampliación de catálogo).
UPDATE productos SET marca = 'ComVibes Leather', color = 'Negro', talla = NULL WHERE idPro = 1;
UPDATE productos SET marca = 'TimeStyle', color = 'Plateado', talla = NULL WHERE idPro = 2;
UPDATE productos SET marca = 'UrbanCap', color = 'Negro', talla = 'Única' WHERE idPro = 3;
UPDATE productos SET marca = 'GoldTouch', color = 'Oro Rosa', talla = NULL WHERE idPro = 4;
UPDATE productos SET marca = 'ComVibes Leather', color = 'Café', talla = NULL WHERE idPro = 5;
UPDATE productos SET marca = 'TrailPack', color = 'Gris', talla = NULL WHERE idPro = 6;
UPDATE productos SET marca = 'SunVibe', color = 'Negro', talla = NULL WHERE idPro = 7;
UPDATE productos SET marca = 'StreetWalk', color = 'Blanco', talla = '38 - 42' WHERE idPro = 8;
UPDATE productos SET marca = 'ComVibes Leather', color = 'Café', talla = '35 - 40' WHERE idPro = 9;
UPDATE productos SET marca = 'DenimCo', color = 'Azul', talla = 'S - XL' WHERE idPro = 10;
UPDATE productos SET marca = 'BasicWear', color = 'Blanco', talla = 'S - XL' WHERE idPro = 11;

SHOW TABLES;
