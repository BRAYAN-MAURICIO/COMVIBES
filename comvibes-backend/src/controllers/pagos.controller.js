const { pool } = require('../config/db')
const { ok, fail } = require('../utils/response')
const asyncHandler = require('../utils/asyncHandler')

// GET /api/pagos/pedido/:idPed - usado por Invoice.jsx (PagosContext.getByOrder)
const getByPedido = asyncHandler(async (req, res) => {
  const [pedidoRows] = await pool.query('SELECT idUsu FROM pedidos WHERE idPed = ?', [req.params.idPed])
  if (pedidoRows.length === 0) return fail(res, 'Pedido no encontrado.', 404)
  if (req.user.rol !== 'admin' && pedidoRows[0].idUsu !== req.user.idUsu) {
    return fail(res, 'No tienes permiso para ver este pago.', 403)
  }

  const [rows] = await pool.query(
    `SELECT pg.*, m.nombre AS metodo FROM pagos pg
     LEFT JOIN metodospago m ON m.idMet = pg.idMet
     WHERE pg.idPed = ?`,
    [req.params.idPed]
  )
  if (rows.length === 0) return fail(res, 'Este pedido no tiene pago registrado.', 404)
  return ok(res, rows[0])
})

module.exports = { getByPedido }
