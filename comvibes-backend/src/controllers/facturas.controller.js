const { pool } = require('../config/db')
const { ok, fail } = require('../utils/response')
const asyncHandler = require('../utils/asyncHandler')

// GET /api/facturas/pedido/:idPed - vista imprimible /factura/:idPed del frontend
const getByPedido = asyncHandler(async (req, res) => {
  const [pedidoRows] = await pool.query('SELECT idUsu FROM pedidos WHERE idPed = ?', [req.params.idPed])
  if (pedidoRows.length === 0) return fail(res, 'Pedido no encontrado.', 404)
  if (req.user.rol !== 'admin' && pedidoRows[0].idUsu !== req.user.idUsu) {
    return fail(res, 'No tienes permiso para ver esta factura.', 403)
  }

  const [rows] = await pool.query('SELECT * FROM facturas WHERE idPed = ?', [req.params.idPed])
  if (rows.length === 0) return fail(res, 'Este pedido no tiene factura.', 404)
  return ok(res, rows[0])
})

module.exports = { getByPedido }
