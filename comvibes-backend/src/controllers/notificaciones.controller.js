const { pool } = require('../config/db')
const { ok, fail } = require('../utils/response')
const asyncHandler = require('../utils/asyncHandler')

// Se llama desde pedidos.controller (cambio de estado) y soporte.controller
// (respuesta del admin), reutilizando la misma lógica que ya generaba las
// notificaciones en el frontend con NotificationsContext.addNotification.
async function crearNotificacion({ idUsu, tipo, mensaje, link }) {
  await pool.query(
    'INSERT INTO notificaciones (idUsu, tipo, mensaje, link, leida) VALUES (?, ?, ?, ?, FALSE)',
    [idUsu, tipo, mensaje, link || null]
  )
}

// GET /api/notificaciones - las del usuario autenticado, más recientes primero
const listNotificaciones = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    'SELECT idNot, idUsu, tipo, mensaje, link, leida, fecha_envio AS fecha FROM notificaciones WHERE idUsu = ? ORDER BY fecha_envio DESC',
    [req.user.idUsu]
  )
  return ok(res, rows.map((r) => ({ ...r, leida: Boolean(r.leida) })))
})

// PATCH /api/notificaciones/:id/leida
const marcarLeida = asyncHandler(async (req, res) => {
  const [result] = await pool.query(
    'UPDATE notificaciones SET leida = TRUE WHERE idNot = ? AND idUsu = ?',
    [req.params.id, req.user.idUsu]
  )
  if (result.affectedRows === 0) return fail(res, 'Notificación no encontrada.', 404)
  return ok(res, { idNot: Number(req.params.id), leida: true })
})

// PATCH /api/notificaciones/marcar-todas
const marcarTodasLeidas = asyncHandler(async (req, res) => {
  await pool.query('UPDATE notificaciones SET leida = TRUE WHERE idUsu = ? AND leida = FALSE', [req.user.idUsu])
  return ok(res, { marcadas: true })
})

module.exports = { listNotificaciones, marcarLeida, marcarTodasLeidas, crearNotificacion }
