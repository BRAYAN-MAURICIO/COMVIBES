// Utilidades compartidas por las pruebas de integración con base de datos
// (fase1.integration.test.js, fase2.integration.test.js).
const request = require('supertest')
const bcrypt = require('bcryptjs')
const { pool } = require('../src/config/db')
const { signToken } = require('../src/utils/jwt')

const PASS = 'Prueba12345'

// RUN_DB_TESTS=1 (npm run test:db) activa las pruebas con base de datos;
// sin él se omiten. setup.js garantiza que apunten a combives_db_test.
const describeDB = process.env.RUN_DB_TESTS === '1' ? describe : describe.skip

async function crearUsuario(correo, rol) {
  const [u] = await pool.query("INSERT INTO usuarios (nombre, apellido) VALUES ('QA', 'Pruebas')")
  const idUsu = u.insertId
  await pool.query(
    "INSERT INTO credencial (idUsu, correo, usuario, contrasena_hash, estado, correo_verificado) VALUES (?, ?, ?, ?, 'activo', TRUE)",
    [idUsu, correo, correo, await bcrypt.hash(PASS, 10)]
  )
  await pool.query('INSERT INTO usuariorol (idUsu, idRol) SELECT ?, idRol FROM roles WHERE nombre = ?', [idUsu, rol])
  await pool.query('INSERT INTO carrito (idUsu) VALUES (?)', [idUsu])
  return { idUsu, correo, token: tokenDe({ idUsu, correo }, rol) }
}

// iat un segundo en el pasado: password_changed_at puede caer en el mismo segundo
const tokenDe = (u, rol) =>
  signToken({ idUsu: u.idUsu, correo: u.correo, rol, iat: Math.floor(Date.now() / 1000) - 1 })

async function stockDe(idPro) {
  const [[r]] = await pool.query('SELECT cantidad_disp FROM inventario WHERE idPro = ?', [idPro])
  return Number(r.cantidad_disp)
}

async function productoConStock(cantidad = 20) {
  const [[p]] = await pool.query(
    'SELECT p.idPro FROM productos p JOIN inventario i ON i.idPro = p.idPro WHERE p.activo = TRUE ORDER BY p.idPro LIMIT 1'
  )
  await pool.query('UPDATE inventario SET cantidad_disp = ? WHERE idPro = ?', [cantidad, p.idPro])
  return p.idPro
}

async function metodoActivo() {
  const [[m]] = await pool.query('SELECT idMet FROM metodospago WHERE activo = TRUE ORDER BY idMet LIMIT 1')
  return m.idMet
}

/** Crea un pedido real por el API: dirección + carrito + checkout. */
async function comprar(app, cliente, idPro, cantidad) {
  const dir = await request(app)
    .post('/api/direcciones')
    .set('Authorization', `Bearer ${cliente.token}`)
    .send({ direccion: 'Calle 1 # 2-3', ciudad: 'Neiva' })
  await request(app)
    .post('/api/carrito/items')
    .set('Authorization', `Bearer ${cliente.token}`)
    .send({ idPro, cantidad })
  const res = await request(app)
    .post('/api/pedidos')
    .set('Authorization', `Bearer ${cliente.token}`)
    .send({ idDir: dir.body.data.idDir, idMet: await metodoActivo() })
  if (res.status !== 201) throw new Error(`Checkout falló: ${res.status} ${res.body.message}`)
  return { idPed: res.body.data.idPed, idDir: dir.body.data.idDir, pedido: res.body.data }
}

module.exports = { PASS, describeDB, crearUsuario, tokenDe, stockDe, productoConStock, metodoActivo, comprar }
