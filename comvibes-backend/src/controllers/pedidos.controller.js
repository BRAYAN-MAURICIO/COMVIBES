const { pool } = require('../config/db')
const { ok, created, fail } = require('../utils/response')
const asyncHandler = require('../utils/asyncHandler')
const { getOrCreateCarritoId, SELECT_ITEMS } = require('./carrito.controller')
const { crearNotificacion } = require('./notificaciones.controller')

function pad(num, size) {
  return String(num).padStart(size, '0')
}

const SELECT_PEDIDO_BASE = `
  SELECT p.idPed, p.idUsu,
    CONCAT(u.nombre, ' ', u.apellido) AS cliente,
    u.nombre, u.apellido,
    DATE_FORMAT(p.fecha_pedido, '%Y-%m-%d') AS fecha_pedido,
    p.estado, p.total
  FROM pedidos p
  JOIN usuarios u ON u.idUsu = p.idUsu
`

async function getPedidoCompleto(idPed) {
  const [pedidoRows] = await pool.query(`${SELECT_PEDIDO_BASE} WHERE p.idPed = ?`, [idPed])
  if (pedidoRows.length === 0) return null
  const pedido = pedidoRows[0]

  const [detalle] = await pool.query(
    `SELECT dp.idDetPed, dp.idPro, dp.cantidad, dp.precio_unitario, pr.nombre
     FROM detallepedido dp JOIN productos pr ON pr.idPro = dp.idPro WHERE dp.idPed = ?`,
    [idPed]
  )
  const [pagoRows] = await pool.query(
    `SELECT pg.*, m.nombre AS metodo FROM pagos pg LEFT JOIN metodospago m ON m.idMet = pg.idMet WHERE pg.idPed = ?`,
    [idPed]
  )
  const [facturaRows] = await pool.query('SELECT * FROM facturas WHERE idPed = ?', [idPed])
  const [envioRows] = await pool.query('SELECT * FROM envios WHERE idPed = ?', [idPed])

  return {
    ...pedido,
    detalle,
    pago: pagoRows[0] || null,
    factura: facturaRows[0] || null,
    envio: envioRows[0] || null,
  }
}

// GET /api/pedidos - propios, o todos si es admin (?idUsu= para admin filtrar por cliente)
// Soporta paginación server-side con ?page=&limit= para clientes con muchos pedidos.
// El admin no pagina (necesita todos para reportes y gestión).
const listPedidos = asyncHandler(async (req, res) => {
  // El WHERE se arma como variable propia (antes se recortaba de la consulta
  // completa con replace().split('ORDER'), frágil ante cualquier cambio en
  // SELECT_PEDIDO_BASE). Observación menor de la auditoría cruzada.
  let whereClause = ''
  const params = []

  if (req.user.rol === 'admin') {
    if (req.query.idUsu) {
      whereClause = ' WHERE p.idUsu = ?'
      params.push(req.query.idUsu)
    }
  } else {
    whereClause = ' WHERE p.idUsu = ?'
    params.push(req.user.idUsu)
  }

  const baseQuery = SELECT_PEDIDO_BASE + whereClause

  // Paginación solo para clientes (el admin necesita todos los pedidos)
  let query = baseQuery + ' ORDER BY p.idPed DESC'
  let queryParams = params
  let total = null
  let totalPages = null
  let page = null

  if (req.user.rol !== 'admin' && req.query.limit) {
    const limitNum = Math.min(50, Math.max(1, Number(req.query.limit) || 10))
    const pageNum  = Math.max(1, Number(req.query.page) || 1)
    const offset   = (pageNum - 1) * limitNum

    // Contar total sin LIMIT para devolver metadata de paginación
    const [[{ total: t }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM pedidos p${whereClause}`,
      params
    )
    total = Number(t)
    totalPages = Math.ceil(total / limitNum)
    page = pageNum
    // LIMIT/OFFSET parametrizados, igual que en productos.controller.js
    // (antes se interpolaban en el string). Observación menor de la auditoría.
    query = baseQuery + ' ORDER BY p.idPed DESC LIMIT ? OFFSET ?'
    queryParams = [...params, limitNum, offset]
  }

  const [pedidos] = await pool.query(query, queryParams)
  // FIX #5: IMPORTANTE — no eliminar esta guarda. mysql2 lanza error si se
  // pasa un array vacío a IN(?). Todas las queries que usan IN(ids) dependen de ella.
  if (pedidos.length === 0) return ok(res, [])

  const ids = pedidos.map((p) => p.idPed)
  const [detalles] = await pool.query(
    `SELECT dp.idPed, dp.idPro, dp.cantidad, dp.precio_unitario, pr.nombre
     FROM detallepedido dp JOIN productos pr ON pr.idPro = dp.idPro
     WHERE dp.idPed IN (?)`,
    [ids]
  )
  const [envios] = await pool.query('SELECT * FROM envios WHERE idPed IN (?)', [ids])
  const [pagos] = await pool.query(
    `SELECT pg.*, m.nombre AS metodo FROM pagos pg LEFT JOIN metodospago m ON m.idMet = pg.idMet WHERE pg.idPed IN (?)`,
    [ids]
  )
  const [facturas] = await pool.query('SELECT * FROM facturas WHERE idPed IN (?)', [ids])
  const [direccionesEnvio] = await pool.query(
    `SELECT e.idPed, d.etiqueta, d.direccion, d.ciudad, d.telefono
     FROM envios e JOIN direcciones d ON d.idDir = e.idDir WHERE e.idPed IN (?)`,
    [ids]
  )

  const detallePorPedido = detalles.reduce((acc, d) => {
    ;(acc[d.idPed] ||= []).push(d)
    return acc
  }, {})
  const porPedido = (rows) => rows.reduce((acc, r) => ({ ...acc, [r.idPed]: r }), {})
  const envioPorPedido = porPedido(envios)
  const pagoPorPedido = porPedido(pagos)
  const facturaPorPedido = porPedido(facturas)
  const direccionPorPedido = porPedido(direccionesEnvio)

  const pedidosConDetalle = pedidos.map((p) => ({
    ...p,
    detalle: detallePorPedido[p.idPed] || [],
    envio: envioPorPedido[p.idPed] || null,
    pago: pagoPorPedido[p.idPed] || null,
    factura: facturaPorPedido[p.idPed] || null,
    // snapshot de la dirección de envío, tal como la esperaba el frontend antes (pedido.direccion)
    direccion: direccionPorPedido[p.idPed] || null,
  }))
  const result = pedidosConDetalle
  if (total !== null) {
    return ok(res, { pedidos: result, total, page, totalPages })
  }
  return ok(res, result)
})

const getPedido = asyncHandler(async (req, res) => {
  const pedido = await getPedidoCompleto(req.params.id)
  if (!pedido) return fail(res, 'Pedido no encontrado.', 404)
  if (req.user.rol !== 'admin' && pedido.idUsu !== req.user.idUsu) {
    return fail(res, 'No tienes permiso para ver este pedido.', 403)
  }
  return ok(res, pedido)
})

// ── Checkout ────────────────────────────────────────────────────────────────
// POST /api/pedidos { idDir, idMet }
// Toma lo que haya en el carrito del usuario y "cierra" la compra:
// pedido + detallepedido + descuenta stock + pago + factura + envio + notificación,
// y al final vacía el carrito.
//
// Refactorización QA (No Conformidad 2): antes toda la compra vivía en una
// sola función de ~115 líneas con ocho responsabilidades. Ahora cada paso es
// una función con una sola tarea y createPedido() solo los orquesta. Los pasos
// que escriben reciben `conn`, así que siguen corriendo dentro de la MISMA
// transacción: si cualquiera lanza, el catch del orquestador hace rollback
// de todo, exactamente como antes.

function errorDeStock(nombreProducto) {
  const err = new Error(`No hay suficiente stock de "${nombreProducto}".`)
  err.status = 400
  return err
}

/**
 * Validaciones previas, FUERA de la transacción: filtran rápido y barato
 * (sin abrir conexión) los casos obvios — carrito vacío, stock claramente
 * insuficiente, dirección ajena. Por sí solas NO evitan la sobreventa si dos
 * clientes compran casi a la vez; la protección real es bloquearYValidarStock().
 *
 * @returns {Promise<{error: {mensaje: string, estado: number}}
 *                 | {idCar: number, items: object[], total: number}>}
 */
async function validarCheckout(idUsu, idDir) {
  const idCar = await getOrCreateCarritoId(idUsu)
  const [items] = await pool.query(SELECT_ITEMS, [idCar])
  if (items.length === 0) return { error: { mensaje: 'Tu carrito está vacío.', estado: 400 } }

  const sinStock = items.find((i) => i.cantidad > i.stock_disponible)
  if (sinStock) {
    return { error: { mensaje: `No hay suficiente stock de "${sinStock.nombre}".`, estado: 400 } }
  }

  const [dirRows] = await pool.query('SELECT * FROM direcciones WHERE idDir = ? AND idUsu = ?', [idDir, idUsu])
  if (dirRows.length === 0) return { error: { mensaje: 'Dirección no válida.', estado: 400 } }

  const total = items.reduce((acc, i) => acc + Number(i.precio) * i.cantidad, 0)
  return { idCar, items, total }
}

/**
 * FIX (RA.04 - Oportunidad de mejora, Módulo 2): re-valida y BLOQUEA el stock
 * dentro de la transacción. Sin esto, dos checkouts concurrentes pueden leer
 * el mismo stock_disponible antes de que ninguno haga commit y vender más
 * unidades de las que existen (sobreventa).
 *
 * SELECT ... FOR UPDATE bloquea la fila de inventario hasta el commit/rollback:
 * un segundo checkout que toque el mismo producto espera a que el primero
 * termine y ve el stock ya actualizado. Los items se recorren ordenados por
 * idPro para que, si dos pedidos comparten varios productos, ambos pidan los
 * bloqueos en el mismo orden y no se produzca un deadlock cruzado.
 */
async function bloquearYValidarStock(conn, items) {
  const itemsOrdenados = [...items].sort((a, b) => a.idPro - b.idPro)
  for (const item of itemsOrdenados) {
    const [invRows] = await conn.query(
      'SELECT cantidad_disp FROM inventario WHERE idPro = ? FOR UPDATE',
      [item.idPro]
    )
    const stockActual = invRows[0]?.cantidad_disp ?? 0
    if (item.cantidad > stockActual) throw errorDeStock(item.nombre)
  }
}

/**
 * Inserta el pedido en estado Pendiente y una fila de detalle por item.
 * @returns {Promise<number>} idPed del pedido creado.
 */
async function insertarPedido(conn, { idUsu, items, total }) {
  const [pedidoResult] = await conn.query(
    "INSERT INTO pedidos (idUsu, estado, total) VALUES (?, 'Pendiente', ?)",
    [idUsu, total]
  )
  const idPed = pedidoResult.insertId

  for (const item of items) {
    await conn.query(
      'INSERT INTO detallepedido (idPed, idPro, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
      [idPed, item.idPro, item.cantidad, item.precio]
    )
  }
  return idPed
}

/**
 * Descuenta del inventario las unidades vendidas. La condición
 * `cantidad_disp >= ?` en el WHERE es una red de seguridad adicional ante
 * cualquier otra ruta que pudiera descontar stock sin pasar por el
 * FOR UPDATE de bloquearYValidarStock() (defensa en profundidad).
 */
async function descontarStock(conn, items) {
  for (const item of items) {
    const [updResult] = await conn.query(
      'UPDATE inventario SET cantidad_disp = cantidad_disp - ? WHERE idPro = ? AND cantidad_disp >= ?',
      [item.cantidad, item.idPro, item.cantidad]
    )
    if (updResult.affectedRows === 0) throw errorDeStock(item.nombre)
  }
}

// Pago: se asume completado al confirmar (igual que el CheckoutFlow actual del frontend)
async function registrarPago(conn, { idPed, idMet, total }) {
  await conn.query(
    "INSERT INTO pagos (idPed, idMet, monto, estado, transaccion_id) VALUES (?, ?, ?, 'Completado', ?)",
    [idPed, idMet, total, `TXN-${Date.now()}`]
  )
}

// Factura: cierra el ciclo de la compra con un comprobante desde el día 1
async function generarFactura(conn, { idPed, total }) {
  const numeroFactura = `FAC-${pad(idPed, 6)}`
  await conn.query(
    'INSERT INTO facturas (idPed, numero_factura, monto_total) VALUES (?, ?, ?)',
    [idPed, numeroFactura, total]
  )
}

// Envío: se crea en Pendiente, el admin lo completa después con transportadora/guía
async function crearEnvio(conn, { idPed, idDir }) {
  await conn.query(
    "INSERT INTO envios (idPed, idDir, estado_envio) VALUES (?, ?, 'Pendiente')",
    [idPed, idDir]
  )
}

// Carrito queda vacío después de una compra exitosa
async function vaciarCarrito(conn, idCar) {
  await conn.query('DELETE FROM detallecarrito WHERE idCar = ?', [idCar])
}

const createPedido = asyncHandler(async (req, res) => {
  const { idDir, idMet } = req.body
  if (!idDir || !idMet) return fail(res, 'idDir e idMet son obligatorios.')

  const idUsu = req.user.idUsu
  const checkout = await validarCheckout(idUsu, idDir)
  if (checkout.error) return fail(res, checkout.error.mensaje, checkout.error.estado)
  const { idCar, items, total } = checkout

  const conn = await pool.getConnection()
  let idPed
  try {
    await conn.beginTransaction()
    await bloquearYValidarStock(conn, items)
    idPed = await insertarPedido(conn, { idUsu, items, total })
    await descontarStock(conn, items)
    await registrarPago(conn, { idPed, idMet, total })
    await generarFactura(conn, { idPed, total })
    await crearEnvio(conn, { idPed, idDir })
    await vaciarCarrito(conn, idCar)
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }

  // Después del commit: la compra ya quedó registrada, así que la
  // notificación y la lectura final van fuera de la transacción.
  await crearNotificacion({
    idUsu,
    tipo: 'pedido',
    mensaje: `Tu pedido #${idPed} fue creado y está Pendiente.`,
    link: '/pedidos',
  })

  const pedidoCompleto = await getPedidoCompleto(idPed)
  return created(res, pedidoCompleto)
})

// PATCH /api/pedidos/:id/estado (admin) - dispara notificación al dueño del pedido
const cambiarEstadoPedido = asyncHandler(async (req, res) => {
  const { estado } = req.body
  const validos = ['Pendiente', 'En Camino', 'Entregado', 'Cancelado']
  if (!validos.includes(estado)) return fail(res, `estado debe ser uno de: ${validos.join(', ')}`)

  const [result] = await pool.query('UPDATE pedidos SET estado = ? WHERE idPed = ?', [estado, req.params.id])
  if (result.affectedRows === 0) return fail(res, 'Pedido no encontrado.', 404)

  const [rows] = await pool.query('SELECT idUsu FROM pedidos WHERE idPed = ?', [req.params.id])
  await crearNotificacion({
    idUsu: rows[0].idUsu,
    tipo: 'pedido',
    mensaje: `Tu pedido #${req.params.id} pasó a ${estado}.`,
    link: '/pedidos',
  })

  const pedidoCompleto = await getPedidoCompleto(req.params.id)
  return ok(res, pedidoCompleto)
})

module.exports = { listPedidos, getPedido, createPedido, cambiarEstadoPedido, getPedidoCompleto }
