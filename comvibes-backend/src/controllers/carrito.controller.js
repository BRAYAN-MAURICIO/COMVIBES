const { pool } = require('../config/db')
const { ok, fail } = require('../utils/response')
const asyncHandler = require('../utils/asyncHandler')

// Cada usuario tiene un carrito 1:1 (se crea en el registro), pero por si
// acaso alguien no lo tiene (usuarios migrados de antes), esto lo crea al vuelo.
async function getOrCreateCarritoId(idUsu) {
  const [rows] = await pool.query('SELECT idCar FROM carrito WHERE idUsu = ?', [idUsu])
  if (rows.length > 0) return rows[0].idCar
  const [result] = await pool.query('INSERT INTO carrito (idUsu) VALUES (?)', [idUsu])
  return result.insertId
}

const SELECT_ITEMS = `
  SELECT
    dc.idDetCar, dc.idPro, dc.cantidad,
    CAST(dc.precio AS DECIMAL(10,2)) AS precio,
    p.nombre,
    COALESCE(p.imagen_url, '') AS imagen,
    p.activo,
    COALESCE(inv.cantidad_disp, 0) AS stock_disponible
  FROM detallecarrito dc
  JOIN productos p ON p.idPro = dc.idPro
  LEFT JOIN inventario inv ON inv.idPro = dc.idPro
  WHERE dc.idCar = ?
  ORDER BY dc.idDetCar ASC
`

function normalizeItem(row) {
  return {
    ...row,
    precio: Number(row.precio) || 0,
    stock_disponible: Number(row.stock_disponible),
    activo: Boolean(row.activo),
    imagen: row.imagen || null,
  }
}

// GET /api/carrito
const getCarrito = asyncHandler(async (req, res) => {
  const idCar = await getOrCreateCarritoId(req.user.idUsu)
  const [items] = await pool.query(SELECT_ITEMS, [idCar])
  return ok(res, { idCar, items: items.map(normalizeItem) })
})

// POST /api/carrito/items { idPro, cantidad }
const addItem = asyncHandler(async (req, res) => {
  const { idPro, cantidad = 1 } = req.body
  if (!idPro) return fail(res, 'idPro es obligatorio.')

  const idCar = await getOrCreateCarritoId(req.user.idUsu)

  const [prodRows] = await pool.query(
    `SELECT p.idPro, p.precio, p.activo, COALESCE(inv.cantidad_disp, 0) AS stock
     FROM productos p LEFT JOIN inventario inv ON inv.idPro = p.idPro WHERE p.idPro = ?`,
    [idPro]
  )
  if (prodRows.length === 0) return fail(res, 'Producto no encontrado.', 404)
  const producto = prodRows[0]
  if (!producto.activo) return fail(res, 'Este producto ya no está disponible.', 400)

  const [existing] = await pool.query('SELECT * FROM detallecarrito WHERE idCar = ? AND idPro = ?', [idCar, idPro])

  const cantidadDeseada = existing.length > 0 ? existing[0].cantidad + cantidad : cantidad
  const cantidadFinal = Math.min(cantidadDeseada, producto.stock)
  if (cantidadFinal <= 0) return fail(res, 'Sin stock disponible para este producto.', 400)

  if (existing.length > 0) {
    await pool.query('UPDATE detallecarrito SET cantidad = ? WHERE idDetCar = ?', [cantidadFinal, existing[0].idDetCar])
  } else {
    await pool.query(
      'INSERT INTO detallecarrito (idCar, idPro, cantidad, precio) VALUES (?, ?, ?, ?)',
      [idCar, idPro, cantidadFinal, producto.precio]
    )
  }

  const [items] = await pool.query(SELECT_ITEMS, [idCar])
  return ok(res, { idCar, items: items.map(normalizeItem) })
})

// PUT /api/carrito/items/:idPro { cantidad }
const updateItem = asyncHandler(async (req, res) => {
  const { cantidad } = req.body
  if (cantidad == null) return fail(res, 'cantidad es obligatoria.')

  const idCar = await getOrCreateCarritoId(req.user.idUsu)

  if (cantidad <= 0) {
    await pool.query('DELETE FROM detallecarrito WHERE idCar = ? AND idPro = ?', [idCar, req.params.idPro])
  } else {
    const [invRows] = await pool.query('SELECT cantidad_disp FROM inventario WHERE idPro = ?', [req.params.idPro])
    const stock = invRows[0]?.cantidad_disp ?? 0
    const cantidadFinal = Math.min(cantidad, stock)
    await pool.query('UPDATE detallecarrito SET cantidad = ? WHERE idCar = ? AND idPro = ?', [
      cantidadFinal, idCar, req.params.idPro,
    ])
  }

  const [items] = await pool.query(SELECT_ITEMS, [idCar])
  return ok(res, { idCar, items: items.map(normalizeItem) })
})

// DELETE /api/carrito/items/:idPro
const removeItem = asyncHandler(async (req, res) => {
  const idCar = await getOrCreateCarritoId(req.user.idUsu)
  await pool.query('DELETE FROM detallecarrito WHERE idCar = ? AND idPro = ?', [idCar, req.params.idPro])
  const [items] = await pool.query(SELECT_ITEMS, [idCar])
  return ok(res, { idCar, items: items.map(normalizeItem) })
})

// DELETE /api/carrito - vaciar todo (se usa después de un checkout exitoso)
const clearCarrito = asyncHandler(async (req, res) => {
  const idCar = await getOrCreateCarritoId(req.user.idUsu)
  await pool.query('DELETE FROM detallecarrito WHERE idCar = ?', [idCar])
  return ok(res, { idCar, items: [] })
})


// POST /api/carrito/sync  { items: [{ idPro, cantidad }] }
// Reemplaza el carrito completo del usuario en una sola transacción.
// El checkout lo usa en vez de clearCarrito + N addItem en serie.
const syncCarrito = asyncHandler(async (req, res) => {
  const { items } = req.body
  if (!Array.isArray(items)) return fail(res, 'items debe ser un array.')

  const idCar = await getOrCreateCarritoId(req.user.idUsu)
  const conn  = await pool.getConnection()

  try {
    await conn.beginTransaction()

    // 1. Vaciar el carrito actual
    await conn.query('DELETE FROM detallecarrito WHERE idCar = ?', [idCar])

    // 2. Insertar los nuevos ítems validando stock producto a producto
    for (const item of items) {
      const { idPro, cantidad } = item
      if (!idPro || !cantidad || cantidad < 1) continue

      const [prodRows] = await conn.query(
        `SELECT p.precio, p.activo, COALESCE(inv.cantidad_disp, 0) AS stock
         FROM productos p LEFT JOIN inventario inv ON inv.idPro = p.idPro
         WHERE p.idPro = ?`,
        [idPro]
      )
      if (prodRows.length === 0 || !prodRows[0].activo) continue

      const cantidadFinal = Math.min(Number(cantidad), Number(prodRows[0].stock))
      if (cantidadFinal <= 0) continue

      await conn.query(
        'INSERT INTO detallecarrito (idCar, idPro, cantidad, precio) VALUES (?, ?, ?, ?)',
        [idCar, idPro, cantidadFinal, prodRows[0].precio]
      )
    }

    await conn.commit()
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }

  const [result] = await pool.query(SELECT_ITEMS, [idCar])
  return ok(res, { idCar, items: result.map(normalizeItem) })
})

module.exports = { getCarrito, addItem, updateItem, removeItem, clearCarrito, syncCarrito, getOrCreateCarritoId, SELECT_ITEMS }
