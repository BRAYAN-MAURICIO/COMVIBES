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