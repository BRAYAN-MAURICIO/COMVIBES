const { pool } = require('../config/db')
const { ok, created, fail } = require('../utils/response')
const asyncHandler = require('../utils/asyncHandler')

const SELECT_OPINIONES = `
  SELECT o.idOpi, o.idPro, o.idUsu, CONCAT(u.nombre, ' ', u.apellido) AS cliente,
         o.comentario, o.calificacion, o.fecha
  FROM opiniones o
  JOIN usuarios u ON u.idUsu = o.idUsu
`

// GET /api/opiniones/producto/:idPro - público, se usa en ProductDetail
const listByProducto = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`${SELECT_OPINIONES} WHERE o.idPro = ? ORDER BY o.fecha DESC`, [req.params.idPro])
  return ok(res, rows)
})

// POST /api/opiniones { idPro, comentario, calificacion }
// Solo puede opinar quien haya comprado el producto (tiene al menos un pedido
// entregado o en camino que incluya ese producto en detallepedido).
const createOpinion = asyncHandler(async (req, res) => {
  const { idPro, comentario, calificacion } = req.body
  if (!idPro || !calificacion) {
    return fail(res, 'idPro y calificacion son obligatorios.')
  }
  if (calificacion < 1 || calificacion > 5) return fail(res, 'calificacion debe estar entre 1 y 5.')

  // Verificar que el usuario haya comprado este producto
  const [compra] = await pool.query(
    `SELECT dp.idPed FROM detallepedido dp
     JOIN pedidos p ON p.idPed = dp.idPed
     WHERE dp.idPro = ? AND p.idUsu = ? AND p.estado IN ('Entregado', 'En Camino')
     LIMIT 1`,
    [idPro, req.user.idUsu]
  )
  if (compra.length === 0) {
    return fail(res, 'Solo puedes opinar sobre productos que hayas comprado.', 403)
  }

  const [existing] = await pool.query('SELECT idOpi FROM opiniones WHERE idPro = ? AND idUsu = ?', [
    idPro, req.user.idUsu,
  ])
  if (existing.length > 0) return fail(res, 'Ya dejaste una reseña para este producto.', 409)

  const [result] = await pool.query(
    'INSERT INTO opiniones (idPro, idUsu, comentario, calificacion) VALUES (?, ?, ?, ?)',
    [idPro, req.user.idUsu, comentario || null, calificacion]
  )

  const [rows] = await pool.query(`${SELECT_OPINIONES} WHERE o.idOpi = ?`, [result.insertId])
  return created(res, rows[0])
})

// DELETE /api/opiniones/:id - dueño de la reseña o admin
const deleteOpinion = asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT idUsu FROM opiniones WHERE idOpi = ?', [req.params.id])
  if (rows.length === 0) return fail(res, 'Reseña no encontrada.', 404)
  if (req.user.rol !== 'admin' && rows[0].idUsu !== req.user.idUsu) {
    return fail(res, 'No tienes permiso para eliminar esta reseña.', 403)
  }
  await pool.query('DELETE FROM opiniones WHERE idOpi = ?', [req.params.id])
  return ok(res, { deleted: true })
})

module.exports = { listByProducto, createOpinion, deleteOpinion }
