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
  let baseQuery = SELECT_PEDIDO_BASE
  const params = []

  if (req.user.rol === 'admin') {
    if (req.query.idUsu) {
      baseQuery += ' WHERE p.idUsu = ?'
      params.push(req.query.idUsu)
    }
  } else {
    baseQuery += ' WHERE p.idUsu = ?'
    params.push(req.user.idUsu)
  }

  // Paginación solo para clientes (el admin necesita todos los pedidos)
  let query = baseQuery + ' ORDER BY p.idPed DESC'
  let total = null
  let totalPages = null
  let page = null

  if (req.user.rol !== 'admin' && req.query.limit) {
    const limitNum = Math.min(50, Math.max(1, Number(req.query.limit) || 10))
    const pageNum  = Math.max(1, Number(req.query.page) || 1)
    const offset   = (pageNum - 1) * limitNum

    // Contar total sin LIMIT para devolver metadata de paginación
    const whereClause = baseQuery.replace(SELECT_PEDIDO_BASE, '').split('ORDER')[0]
    const [[{ total: t }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM pedidos p${whereClause}`,
      params
    )
    total = Number(t)
    totalPages = Math.ceil(total / limitNum)
    page = pageNum
    query = baseQuery + ` ORDER BY p.idPed DESC LIMIT ${limitNum} OFFSET ${offset}`
  }

  const [pedidos] = await pool.query(query, params)
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

// POST /api/pedidos { idDir, idMet }
// Toma lo que haya en el carrito del usuario y "cierra" la compra:
// pedido + detallepedido + descuenta stock + pago + factura + envio + notificación,
// y al final vacía el carrito. Todo en una sola transacción.
const createPedido = asyncHandler(async (req, res) => {
  const { idDir, idMet } = req.body
  if (!idDir || !idMet) return fail(res, 'idDir e idMet son obligatorios.')

  const idCar = await getOrCreateCarritoId(req.user.idUsu)
  const [items] = await pool.query(SELECT_ITEMS, [idCar])
  if (items.length === 0) return fail(res, 'Tu carrito está vacío.', 400)

  // Chequeo temprano fuera de la transacción: filtra el caso obvio rápido y
  // barato (sin abrir conexión), pero por sí solo NO evita sobreventa si dos
  // clientes hacen checkout casi al mismo tiempo — ver el bloqueo de filas
  // más abajo, dentro de la transacción, que es la protección real.
  const sinStock = items.find((i) => i.cantidad > i.stock_disponible)
  if (sinStock) return fail(res, `No hay suficiente stock de "${sinStock.nombre}".`, 400)

  const [dirRows] = await pool.query('SELECT * FROM direcciones WHERE idDir = ? AND idUsu = ?', [idDir, req.user.idUsu])
  if (dirRows.length === 0) return fail(res, 'Dirección no válida.', 400)

  const total = items.reduce((acc, i) => acc + Number(i.precio) * i.cantidad, 0)

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    // FIX (RA.04 - Oportunidad de mejora, Módulo 2): re-validar y bloquear el
    // stock DENTRO de la transacción, no solo con la lectura de más arriba.
    // Sin esto, dos checkouts concurrentes pueden leer el mismo
    // stock_disponible antes de que ninguno haga commit y ambos pasar la
    // validación, vendiendo más unidades de las que existen (sobreventa).
    //
    // SELECT ... FOR UPDATE bloquea la fila de inventario hasta el
    // commit/rollback: un segundo checkout que toque el mismo producto
    // espera a que el primero termine y ve el stock ya actualizado.
    // Se recorren los items ordenados por idPro para que, si dos pedidos
    // comparten varios productos, ambos pidan los bloqueos en el mismo
    // orden y no se produzca un deadlock cruzado.
    const itemsOrdenados = [...items].sort((a, b) => a.idPro - b.idPro)
    for (const item of itemsOrdenados) {
      const [invRows] = await conn.query(
        'SELECT cantidad_disp FROM inventario WHERE idPro = ? FOR UPDATE',
        [item.idPro]
      )
      const stockActual = invRows[0]?.cantidad_disp ?? 0
      if (item.cantidad > stockActual) {
        const err = new Error(`No hay suficiente stock de "${item.nombre}".`)
        err.status = 400
        throw err
      }
    }

    const [pedidoResult] = await conn.query(
      "INSERT INTO pedidos (idUsu, estado, total) VALUES (?, 'Pendiente', ?)",
      [req.user.idUsu, total]
    )
    const idPed = pedidoResult.insertId

    for (const item of items) {
      await conn.query(
        'INSERT INTO detallepedido (idPed, idPro, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
        [idPed, item.idPro, item.cantidad, item.precio]
      )
      // Condición cantidad_disp >= ? en el WHERE: red de seguridad adicional
      // ante cualquier otra ruta que pudiera descontar stock sin pasar por el
      // FOR UPDATE de arriba (defensa en profundidad).
      const [updResult] = await conn.query(
        'UPDATE inventario SET cantidad_disp = cantidad_disp - ? WHERE idPro = ? AND cantidad_disp >= ?',
        [item.cantidad, item.idPro, item.cantidad]
      )
      if (updResult.affectedRows === 0) {
        const err = new Error(`No hay suficiente stock de "${item.nombre}".`)
        err.status = 400
        throw err
      }
    }

    // Pago: se asume completado al confirmar (igual que el CheckoutFlow actual del frontend)
    await conn.query(
      "INSERT INTO pagos (idPed, idMet, monto, estado, transaccion_id) VALUES (?, ?, ?, 'Completado', ?)",
      [idPed, idMet, total, `TXN-${Date.now()}`]
    )

    // Factura: cierra el ciclo de la compra con un comprobante desde el día 1
    const numeroFactura = `FAC-${pad(idPed, 6)}`
    await conn.query(
      'INSERT INTO facturas (idPed, numero_factura, monto_total) VALUES (?, ?, ?)',
      [idPed, numeroFactura, total]
    )

    // Envío: se crea en Pendiente, el admin lo completa después con transportadora/guía
    await conn.query(
      "INSERT INTO envios (idPed, idDir, estado_envio) VALUES (?, ?, 'Pendiente')",
      [idPed, idDir]
    )

    // Carrito queda vacío después de una compra exitosa
    await conn.query('DELETE FROM detallecarrito WHERE idCar = ?', [idCar])

    await conn.commit()

    await crearNotificacion({
      idUsu: req.user.idUsu,
      tipo: 'pedido',
      mensaje: `Tu pedido #${idPed} fue creado y está Pendiente.`,
      link: '/pedidos',
    })

    const pedidoCompleto = await getPedidoCompleto(idPed)
    return created(res, pedidoCompleto)
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
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
