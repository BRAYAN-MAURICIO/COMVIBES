const { pool } = require('../config/db')
const { ok } = require('../utils/response')
const asyncHandler = require('../utils/asyncHandler')

// GET /api/auditoria?entidad=&idEntidad=&page=&limit= (solo admin)
// Bitácora de acciones administrativas, la más reciente primero.
// Auditoría ISO 2026-09-26, hallazgo H12.
const listar = asyncHandler(async (req, res) => {
  const where = []
  const params = []

  if (req.query.entidad) {
    where.push('a.entidad = ?')
    params.push(String(req.query.entidad))
  }
  if (req.query.idEntidad) {
    where.push('a.id_entidad = ?')
    params.push(Number(req.query.idEntidad) || 0)
  }
  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50))
  const page = Math.max(1, Number(req.query.page) || 1)

  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM auditoria_admin a ${whereClause}`, params)
  const [rows] = await pool.query(
    `SELECT a.idAud, a.idUsu, CONCAT(u.nombre, ' ', u.apellido) AS admin,
            a.accion, a.entidad, a.id_entidad, a.detalle, a.ip,
            DATE_FORMAT(a.fecha, '%Y-%m-%d %H:%i:%s') AS fecha
       FROM auditoria_admin a
       LEFT JOIN usuarios u ON u.idUsu = a.idUsu
       ${whereClause}
      ORDER BY a.idAud DESC
      LIMIT ? OFFSET ?`,
    [...params, limit, (page - 1) * limit]
  )

  const registros = rows.map((r) => {
    let detalle
    try { detalle = r.detalle ? JSON.parse(r.detalle) : null } catch { detalle = r.detalle }
    return { ...r, detalle }
  })

  return ok(res, { registros, total: Number(total), page, totalPages: Math.ceil(Number(total) / limit) })
})

module.exports = { listar }
