const { pool } = require('../config/db')
const { ok, created, fail } = require('../utils/response')
const asyncHandler = require('../utils/asyncHandler')

const SELECT_WISHLIST = `
  SELECT w.idDeseo, w.idPro, w.fecha,
    p.nombre, CAST(p.precio AS CHAR) AS precio_str,
    p.imagen_url AS imagen, p.activo,
    p.marca, p.color, p.talla,
    COALESCE(inv.cantidad_disp, 0) AS stock
  FROM lista_deseos w
  JOIN productos p ON p.idPro = w.idPro
  LEFT JOIN inventario inv ON inv.idPro = p.idPro
  WHERE w.idUsu = ?
  ORDER BY w.fecha DESC
`

function normalize(rows) {
  return rows.map((r) => ({
    ...r,
    precio: Number(r.precio_str) || 0,
    precio_str: undefined,
    activo: Boolean(r.activo),
    stock: Number(r.stock),
  }))
}

const getWishlist = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(SELECT_WISHLIST, [req.user.idUsu])
  return ok(res, normalize(rows))
})

// POST /api/wishlist { idPro } — agrega si no está, quita si ya estaba (toggle)
const toggleWishlist = asyncHandler(async (req, res) => {
  const { idPro } = req.body
  if (!idPro) return fail(res, 'idPro es obligatorio.')

  const [existing] = await pool.query(
    'SELECT idDeseo FROM lista_deseos WHERE idUsu = ? AND idPro = ?',
    [req.user.idUsu, idPro]
  )

  if (existing.length > 0) {
    await pool.query('DELETE FROM lista_deseos WHERE idDeseo = ?', [existing[0].idDeseo])
    const [rows] = await pool.query(SELECT_WISHLIST, [req.user.idUsu])
    return ok(res, { added: false, items: normalize(rows) })
  }

  await pool.query('INSERT INTO lista_deseos (idUsu, idPro) VALUES (?, ?)', [req.user.idUsu, idPro])
  const [rows] = await pool.query(SELECT_WISHLIST, [req.user.idUsu])
  return created(res, { added: true, items: normalize(rows) })
})

const removeFromWishlist = asyncHandler(async (req, res) => {
  await pool.query('DELETE FROM lista_deseos WHERE idUsu = ? AND idPro = ?', [req.user.idUsu, req.params.idPro])
  const [rows] = await pool.query(SELECT_WISHLIST, [req.user.idUsu])
  return ok(res, normalize(rows))
})

module.exports = { getWishlist, toggleWishlist, removeFromWishlist }
