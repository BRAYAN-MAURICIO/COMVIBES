-- ============================================================
-- ComVibes — Base de datos completa y definitiva
-- Motor: MySQL 8+ / MariaDB 10.6+
-- Charset: utf8mb4 (soporta tildes, ñ y emojis)
-- ============================================================
-- INSTRUCCIONES:
--   mysql -u root --default-character-set=utf8mb4 < Comvibes_db_final.sql
-- ============================================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET collation_connection = utf8mb4_unicode_ci;

DROP DATABASE IF EXISTS combives_db;
CREATE DATABASE combives_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
USE combives_db;

-- ============================================================
-- 1. TABLAS BASE (sin dependencias externas)
-- ============================================================

CREATE TABLE roles (
    idRol       INT AUTO_INCREMENT PRIMARY KEY,
    nombre      VARCHAR(50)  UNIQUE NOT NULL,
    descripcion VARCHAR(150)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE categorias (
    idCat       INT AUTO_INCREMENT PRIMARY KEY,
    nombre      VARCHAR(100) NOT NULL,
    descripcion VARCHAR(200)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE proveedores (
    idProv    INT AUTO_INCREMENT PRIMARY KEY,
    nombre    VARCHAR(150) NOT NULL,
    -- Rubro o categoría del proveedor (ej. Bolsos y Carteras, Calzado)
    categoria VARCHAR(100) NULL,
    contacto  VARCHAR(100),
    telefono  VARCHAR(20),
    correo    VARCHAR(100),
    direccion VARCHAR(255),
    ciudad    VARCHAR(100),
    pais      VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE metodospago (
    idMet          INT AUTO_INCREMENT PRIMARY KEY,
    nombre         VARCHAR(50)  UNIQUE NOT NULL,
    descripcion    VARCHAR(150),
    activo         BOOLEAN  DEFAULT TRUE,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 2. USUARIOS Y AUTENTICACIÓN
-- ============================================================

CREATE TABLE usuarios (
    idUsu           INT AUTO_INCREMENT PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL,
    apellido        VARCHAR(100) NOT NULL,
    fecha_nacimiento DATE,
    genero          ENUM('Masculino','Femenino','Otro','Prefiero no decir'),
    fecha_registro  DATETIME DEFAULT CURRENT_TIMESTAMP,
    documento_id    VARCHAR(20) UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE credencial (
    idCred         INT AUTO_INCREMENT PRIMARY KEY,
    idUsu          INT UNIQUE,
    correo         VARCHAR(100) UNIQUE NOT NULL,
    usuario        VARCHAR(50)  UNIQUE NOT NULL,
    -- Siempre almacenar hash bcrypt; NUNCA texto plano en producción.
    -- El script scripts/hashPasswords.js convierte los hashes de prueba.
    contrasena_hash VARCHAR(255) NOT NULL,
    fecha_creacion  DATETIME DEFAULT CURRENT_TIMESTAMP,
    ultimo_acceso   DATETIME,
    estado          ENUM('activo','inactivo','bloqueado') DEFAULT 'activo',
    FOREIGN KEY (idUsu) REFERENCES usuarios(idUsu) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE usuariorol (
    idUsu INT,
    idRol INT,
    PRIMARY KEY (idUsu, idRol),
    FOREIGN KEY (idUsu) REFERENCES usuarios(idUsu) ON DELETE CASCADE,
    FOREIGN KEY (idRol) REFERENCES roles(idRol)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE contacto (
    idCont             INT AUTO_INCREMENT PRIMARY KEY,
    idUsu              INT,
    telefono           VARCHAR(20),
    correo_alternativo VARCHAR(100),
    red_social         VARCHAR(50),
    tipo_contacto      ENUM('personal','laboral','emergencia'),
    FOREIGN KEY (idUsu) REFERENCES usuarios(idUsu) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla para recuperación de contraseña (flujo de código de 6 dígitos).
-- En producción el código se envía por email (Nodemailer).
-- En modo demo el backend lo retorna en la respuesta.
CREATE TABLE password_resets (
    idReset   INT AUTO_INCREMENT PRIMARY KEY,
    idUsu     INT NOT NULL,
    codigo    VARCHAR(6)  NOT NULL,
    expira_en DATETIME    NOT NULL,
    usado     BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (idUsu) REFERENCES usuarios(idUsu) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 3. CATÁLOGO DE PRODUCTOS
-- ============================================================

CREATE TABLE productos (
    idPro        INT AUTO_INCREMENT PRIMARY KEY,
    nombre       VARCHAR(150) NOT NULL,
    -- Marca del producto (ej. ComVibes Leather, TimeStyle)
    marca        VARCHAR(100) NULL,
    descripcion  TEXT,
    precio       DECIMAL(10,2) NOT NULL,
    -- Color disponible principal (ej. Negro, Café, Azul)
    color        VARCHAR(50)  NULL,
    -- Talla si aplica (ej. S - XL, 38 - 42) — NULL para bolsos/accesorios
    talla        VARCHAR(50)  NULL,
    fecha_agregado DATETIME   DEFAULT CURRENT_TIMESTAMP,
    idProv       INT,
    idCat        INT,
    imagen_url   VARCHAR(255),
    activo       BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (idProv) REFERENCES proveedores(idProv),
    FOREIGN KEY (idCat)  REFERENCES categorias(idCat)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Galería: un producto puede tener varias imágenes (relación 1:N)
CREATE TABLE producto_imagenes (
    idImg INT AUTO_INCREMENT PRIMARY KEY,
    idPro INT NOT NULL,
    url   VARCHAR(255) NOT NULL,
    orden INT DEFAULT 0,
    FOREIGN KEY (idPro) REFERENCES productos(idPro) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Stock separado del producto para poder actualizar sin tocar el catálogo
CREATE TABLE inventario (
    idInv              INT AUTO_INCREMENT PRIMARY KEY,
    idPro              INT UNIQUE,
    cantidad_disp      INT  NOT NULL DEFAULT 0,
    ubicacion          VARCHAR(100),
    ultima_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (idPro) REFERENCES productos(idPro) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 4. CLIENTES — DIRECCIONES Y LISTA DE DESEOS
-- ============================================================

CREATE TABLE direcciones (
    idDir          INT AUTO_INCREMENT PRIMARY KEY,
    idUsu          INT,
    -- Etiqueta descriptiva (Casa, Trabajo, Otro)
    etiqueta       VARCHAR(50)  NULL,
    direccion      VARCHAR(255) NOT NULL,
    -- Departamento de Colombia (ej. Huila, Antioquia)
    departamento   VARCHAR(100) NULL,
    ciudad         VARCHAR(100) NOT NULL,
    pais           VARCHAR(100) NOT NULL DEFAULT 'Colombia',
    codigo_postal  VARCHAR(20),
    -- Teléfono de contacto para el mensajero
    telefono       VARCHAR(20)  NULL,
    -- Solo una dirección puede ser predeterminada por usuario
    predeterminada BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (idUsu) REFERENCES usuarios(idUsu) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE lista_deseos (
    idDeseo INT AUTO_INCREMENT PRIMARY KEY,
    idUsu   INT NOT NULL,
    idPro   INT NOT NULL,
    fecha   DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_usuario_producto (idUsu, idPro),
    FOREIGN KEY (idUsu) REFERENCES usuarios(idUsu) ON DELETE CASCADE,
    FOREIGN KEY (idPro) REFERENCES productos(idPro) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 5. CARRITO DE COMPRAS
-- ============================================================

CREATE TABLE carrito (
    idCar          INT AUTO_INCREMENT PRIMARY KEY,
    idUsu          INT UNIQUE,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (idUsu) REFERENCES usuarios(idUsu) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE detallecarrito (
    idDetCar INT AUTO_INCREMENT PRIMARY KEY,
    idCar    INT,
    idPro    INT,
    cantidad INT          NOT NULL,
    -- precio al momento de agregar al carrito (puede diferir del precio actual)
    precio   DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (idCar) REFERENCES carrito(idCar)    ON DELETE CASCADE,
    FOREIGN KEY (idPro) REFERENCES productos(idPro)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 6. PEDIDOS, PAGOS, ENVÍOS Y FACTURAS
-- ============================================================

CREATE TABLE pedidos (
    idPed       INT AUTO_INCREMENT PRIMARY KEY,
    idUsu       INT,
    fecha_pedido DATETIME DEFAULT CURRENT_TIMESTAMP,
    estado      ENUM('Pendiente','En Camino','Entregado','Cancelado') DEFAULT 'Pendiente',
    total       DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (idUsu) REFERENCES usuarios(idUsu)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE detallepedido (
    idDetPed       INT AUTO_INCREMENT PRIMARY KEY,
    idPed          INT,
    idPro          INT,
    cantidad       INT           NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (idPed) REFERENCES pedidos(idPed)   ON DELETE CASCADE,
    FOREIGN KEY (idPro) REFERENCES productos(idPro)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE pagos (
    idPago         INT AUTO_INCREMENT PRIMARY KEY,
    idPed          INT UNIQUE,
    idMet          INT,
    fecha_pago     DATETIME DEFAULT CURRENT_TIMESTAMP,
    monto          DECIMAL(10,2) NOT NULL,
    estado         ENUM('Pendiente','Completado','Fallido','Reembolsado') DEFAULT 'Pendiente',
    transaccion_id VARCHAR(100),
    FOREIGN KEY (idPed) REFERENCES pedidos(idPed),
    FOREIGN KEY (idMet) REFERENCES metodospago(idMet)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE envios (
    idEnv             INT AUTO_INCREMENT PRIMARY KEY,
    idPed             INT UNIQUE,
    idDir             INT,
    -- Nombre de la empresa transportadora (ej. Servientrega, TCC)
    transportadora    VARCHAR(100),
    -- Número de guía para rastreo
    numero_guia       VARCHAR(50)  NULL,
    estado_envio      ENUM('Pendiente','Enviado','En tránsito','Entregado','Devuelto'),
    fecha_envio       DATETIME,
    -- Fecha estimada de entrega
    fecha_estimada    DATE NULL,
    telefono_contacto VARCHAR(20),
    FOREIGN KEY (idPed) REFERENCES pedidos(idPed),
    FOREIGN KEY (idDir) REFERENCES direcciones(idDir)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE facturas (
    idFac          INT AUTO_INCREMENT PRIMARY KEY,
    idPed          INT UNIQUE,
    -- Número legible de factura (ej. FAC-000001), generado por el backend
    numero_factura VARCHAR(20) NULL,
    fecha_emision  DATETIME DEFAULT CURRENT_TIMESTAMP,
    monto_total    DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (idPed) REFERENCES pedidos(idPed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 7. INTERACCIÓN CON CLIENTES
-- ============================================================

CREATE TABLE notificaciones (
    idNot      INT AUTO_INCREMENT PRIMARY KEY,
    idUsu      INT,
    -- Tipo de notificación (usado para el ícono en la campanita)
    tipo       ENUM('pedido','soporte') NOT NULL DEFAULT 'pedido',
    mensaje    TEXT NOT NULL,
    -- URL interna a la que navegar al hacer clic
    link       VARCHAR(255) NULL,
    fecha_envio DATETIME DEFAULT CURRENT_TIMESTAMP,
    estado     ENUM('pendiente','enviado','leido') DEFAULT 'pendiente',
    -- Marcado desde el frontend con PATCH /api/notificaciones/:id/leida
    leida      BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (idUsu) REFERENCES usuarios(idUsu) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE opiniones (
    idOpi        INT AUTO_INCREMENT PRIMARY KEY,
    idPro        INT,
    idUsu        INT,
    comentario   TEXT,
    calificacion INT CHECK (calificacion BETWEEN 1 AND 5),
    fecha        DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (idPro) REFERENCES productos(idPro) ON DELETE CASCADE,
    FOREIGN KEY (idUsu) REFERENCES usuarios(idUsu)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE soporte (
    idTick          INT AUTO_INCREMENT PRIMARY KEY,
    idUsu           INT,
    -- Solo se usan cuando idUsu es NULL: ticket creado por un invitado sin
    -- cuenta. Con sesión, el nombre/correo real se toma de usuarios/credencial.
    guest_nombre    VARCHAR(150),
    guest_correo    VARCHAR(150),
    asunto          VARCHAR(150) NOT NULL,
    descripcion     TEXT NOT NULL,
    respuesta_admin TEXT,
    -- Los tres estados que usa el frontend (Cerrado, no Resuelto)
    estado          ENUM('Abierto','En Progreso','Cerrado') DEFAULT 'Abierto',
    fecha_creacion  DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_resolucion DATETIME,
    FOREIGN KEY (idUsu) REFERENCES usuarios(idUsu)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE reportes (
    idRep             INT AUTO_INCREMENT PRIMARY KEY,
    tipo              VARCHAR(50) NOT NULL,
    contenido         TEXT,
    fecha_generacion  DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 8. DATOS DE PRUEBA — Roles y usuarios iniciales
-- ============================================================

INSERT INTO roles (nombre, descripcion) VALUES
('admin',   'Administrador del sistema con todos los permisos'),
('cliente', 'Usuario regular que realiza compras');

INSERT INTO usuarios (nombre, apellido, documento_id) VALUES
('Admin',    'ComVibes', '100000001'),
('Cliente',  'Prueba',   '100000002');

-- IMPORTANTE: 'admin123'/'cliente123' son solo placeholders temporales para
-- que las filas existan antes de correr el script de seed. NO uses la app
-- con estos valores tal cual: ejecuta `npm run seed:hash` en el backend,
-- que los REEMPLAZA por contraseñas aleatorias nuevas (hasheadas con bcrypt)
-- y las imprime una sola vez en la consola. Sin ese paso, las cuentas
-- admin/cliente no van a poder iniciar sesión (el login compara con bcrypt).
INSERT INTO credencial (idUsu, correo, usuario, contrasena_hash) VALUES
(1, 'admin@combives.com', 'admin',   'admin123'),
(2, 'cliente@test.com',   'cliente', 'cliente123');

INSERT INTO usuariorol (idUsu, idRol) VALUES
(1, 1),
(2, 2);

-- ============================================================
-- 9. DATOS DE PRUEBA — Métodos de pago
-- ============================================================

INSERT INTO metodospago (nombre, descripcion, activo) VALUES
('Tarjeta de crédito',  'Visa / Mastercard',          TRUE),
('Tarjeta débito',      'Débito bancario',             TRUE),
('Transferencia PSE',   'Pago por PSE',                TRUE),
('Nequi',               'Pago por billetera digital',  TRUE),
('Daviplata',           'Pago por Daviplata',          TRUE),
('Efectivo',            'Pago contra entrega',         FALSE);

-- ============================================================
-- 10. DATOS DE PRUEBA — Categorías
-- ============================================================

INSERT INTO categorias (nombre, descripcion) VALUES
('Bolsos y Carteras', 'Todo tipo de bolsos, morrales y carteras'),
('Accesorios',        'Joyas, relojes, billeteras, gorras y sombreros'),
('Calzado',           'Tenis, sandalias y zapatos para complementar tu estilo'),
('Ropa Casual',       'Chaquetas, camisetas y prendas para el día a día');

-- ============================================================
-- 11. DATOS DE PRUEBA — Proveedores
-- ============================================================

INSERT INTO proveedores (idProv, nombre, categoria, contacto, telefono, correo, ciudad, pais) VALUES
(1, 'ComVibes Leather Co.',  'Bolsos y Carteras', 'Juan Peña',     '6018001234', 'ventas@comvibesleather.com', 'Bogotá',       'Colombia'),
(2, 'TimeStyle International','Accesorios',        'Ana Torres',    '6017005678', 'info@timestyleco.com',       'Medellín',     'Colombia'),
(3, 'UrbanCap S.A.S',         'Accesorios',        'Luis Gómez',    '6016009012', 'pedidos@urbancap.co',        'Cali',         'Colombia'),
(4, 'GoldTouch Joyería',      'Accesorios',        'María Ruiz',    '6013002345', 'contacto@goldtouch.com.co',  'Neiva',        'Colombia'),
(5, 'TrailPack Ltda.',         'Bolsos y Carteras', 'Carlos Díaz',   '6012006789', 'ventas@trailpack.co',        'Bucaramanga',  'Colombia'),
(6, 'StreetWalk Calzado',      'Calzado',           'Paula Mora',    '6011000123', 'info@streetwalk.co',         'Barranquilla', 'Colombia'),
(7, 'DenimCo Industries',      'Ropa Casual',       'Ricardo Vega',  '6014004567', 'ventas@deniminco.com',       'Manizales',    'Colombia');

-- ============================================================
-- 12. DATOS DE PRUEBA — Productos (11 del catálogo original)
-- ============================================================

INSERT INTO productos (nombre, marca, descripcion, precio, color, talla, idProv, idCat, imagen_url) VALUES
-- Bolsos y Carteras (idCat=1)
('Bolso Tote Cuero',              'ComVibes Leather', 'Bolso tote en cuero genuino color negro',                         120000.00, 'Negro',    NULL,      1, 1, '/src/assets/img/productos/bolso-tote-cuero.jpg'),
('Mochila Casual Impermeable',    'TrailPack',        'Mochila urbana resistente al agua con compartimento para portátil',95000.00,  'Gris',     NULL,      5, 1, '/src/assets/img/productos/mochila-casual.jpg'),

-- Accesorios (idCat=2)
('Reloj Unisex Vintage',          'TimeStyle',        'Reloj analógico con correa de acero',                              85000.00, 'Plateado', NULL,      2, 2, '/src/assets/img/productos/reloj-unisex-vintage.jpg'),
('Gorra Deportiva',               'UrbanCap',         'Gorra ajustable color negra con bordado',                          35000.00, 'Negro',    'Única',   3, 2, '/src/assets/img/productos/gorra-deportiva.jpg'),
('Juego de Joyas (Anillo + Aretes)','GoldTouch',      'Joyería en oro rosa',                                             250000.00, 'Oro Rosa', NULL,      4, 2, '/src/assets/img/productos/juego-joyas.jpg'),
('Billetera de Cuero',            'ComVibes Leather', 'Billetera ejecutiva con 7 compartimentos',                         45000.00, 'Café',     NULL,      1, 2, '/src/assets/img/productos/billetera-cuero.jpg'),
('Gafas de Sol Retro',            'SunVibe',          'Gafas de sol con montura redonda y protección UV400',              55000.00, 'Negro',    NULL,      2, 2, '/src/assets/img/productos/gafas-sol-retro.jpg'),

-- Calzado (idCat=3)
('Tenis Urbanos Blancos',         'StreetWalk',       'Tenis unisex de lona, suela cómoda para uso diario',             130000.00, 'Blanco',   '38 - 42', 6, 3, '/src/assets/img/productos/tenis-urbanos.jpg'),
('Sandalias de Cuero',            'ComVibes Leather', 'Sandalias artesanales en cuero, cómodas y livianas',              60000.00, 'Café',     '35 - 40', 1, 3, '/src/assets/img/productos/sandalias-cuero.jpg'),

-- Ropa Casual (idCat=4)
('Chaqueta Denim Oversize',       'DenimCo',          'Chaqueta de jean estilo oversize, unisex',                        145000.00, 'Azul',     'S - XL',  7, 4, '/src/assets/img/productos/chaqueta-denim.jpg'),
('Camiseta Básica Algodón',       'BasicWear',        'Camiseta 100% algodón, disponible en varios colores',             40000.00, 'Blanco',   'S - XL',  7, 4, '/src/assets/img/productos/camiseta-basica.jpg');

-- ============================================================
-- 13. DATOS DE PRUEBA — Inventario
-- ============================================================

INSERT INTO inventario (idPro, cantidad_disp, ubicacion) VALUES
(1,  10, 'Estante A1'),
(2,  18, 'Estante A2'),
(3,  25, 'Vitrina Central'),
(4,  50, 'Estante B3'),
(5,   5, 'Vitrina Exclusiva'),
(6,  30, 'Estante C2'),
(7,  22, 'Vitrina Central'),
(8,  14, 'Estante D1'),
(9,   0, 'Estante D2'),
(10,  9, 'Estante E1'),
(11, 40, 'Estante E2');

-- ============================================================
-- 14. DATOS DE PRUEBA — Galería de imágenes por producto
-- ============================================================

INSERT INTO producto_imagenes (idPro, url, orden) VALUES
(1, '/src/assets/img/productos/bolso-tote-cuero.jpg',   1),
(1, '/src/assets/img/productos/bolso-tote-cuero-2.jpg', 2),
(1, '/src/assets/img/productos/bolso-tote-cuero-3.jpg', 3),
(2, '/src/assets/img/productos/mochila-casual.jpg',     1),
(2, '/src/assets/img/productos/mochila-casual-2.jpg',   2),
(2, '/src/assets/img/productos/mochila-casual-3.jpg',   3),
(3, '/src/assets/img/productos/reloj-unisex-vintage.jpg',   1),
(3, '/src/assets/img/productos/reloj-unisex-vintage-2.jpg', 2),
(3, '/src/assets/img/productos/reloj-unisex-vintage-3.jpg', 3),
(4, '/src/assets/img/productos/gorra-deportiva.jpg',    1),
(4, '/src/assets/img/productos/gorra-deportiva-2.jpg',  2),
(4, '/src/assets/img/productos/gorra-deportiva-3.jpg',  3),
(5, '/src/assets/img/productos/juego-joyas.jpg',        1),
(5, '/src/assets/img/productos/juego-joyas-2.jpg',      2),
(5, '/src/assets/img/productos/juego-joyas-3.jpg',      3),
(6, '/src/assets/img/productos/billetera-cuero.jpg',    1),
(6, '/src/assets/img/productos/billetera-cuero-2.jpg',  2),
(6, '/src/assets/img/productos/billetera-cuero-3.jpg',  3),
(7, '/src/assets/img/productos/gafas-sol-retro.jpg',    1),
(7, '/src/assets/img/productos/gafas-sol-retro-2.jpg',  2),
(7, '/src/assets/img/productos/gafas-sol-retro-3.jpg',  3),
(8, '/src/assets/img/productos/tenis-urbanos.jpg',      1),
(8, '/src/assets/img/productos/tenis-urbanos-2.jpg',    2),
(8, '/src/assets/img/productos/tenis-urbanos-3.jpg',    3),
(9, '/src/assets/img/productos/sandalias-cuero.jpg',    1),
(9, '/src/assets/img/productos/sandalias-cuero-2.jpg',  2),
(9, '/src/assets/img/productos/sandalias-cuero-3.jpg',  3),
(10,'/src/assets/img/productos/chaqueta-denim.jpg',     1),
(10,'/src/assets/img/productos/chaqueta-denim-2.jpg',   2),
(10,'/src/assets/img/productos/chaqueta-denim-3.jpg',   3),
(11,'/src/assets/img/productos/camiseta-basica.jpg',    1),
(11,'/src/assets/img/productos/camiseta-basica-2.jpg',  2),
(11,'/src/assets/img/productos/camiseta-basica-3.jpg',  3);

-- ============================================================
-- 15. DATOS DE PRUEBA — Pedido de ejemplo (usuario cliente)
-- ============================================================

INSERT INTO pedidos (idUsu, estado, total) VALUES (2, 'Entregado', 120000.00);

INSERT INTO detallepedido (idPed, idPro, cantidad, precio_unitario) VALUES
(1, 1, 1, 120000.00);

INSERT INTO pagos (idPed, idMet, monto, estado) VALUES
(1, 1, 120000.00, 'Completado');

INSERT INTO facturas (idPed, numero_factura, monto_total) VALUES
(1, 'FAC-000001', 120000.00);

-- ============================================================
-- 16. VERIFICACIÓN FINAL
-- ============================================================

SELECT
    TABLE_NAME                                              AS `Tabla`,
    TABLE_ROWS                                              AS `Filas aprox.`,
    ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024, 1)          AS `Tamaño KB`
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'combives_db'
ORDER BY TABLE_NAME;
