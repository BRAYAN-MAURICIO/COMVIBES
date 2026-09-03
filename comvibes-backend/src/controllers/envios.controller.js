const { pool } = require('../config/db')
const { ok, fail } = require('../utils/response')
const asyncHandler = require('../utils/asyncHandler')

// GET /api/envios/pedido/:idPed - el dueño del pedido o un admin
const getByPedido = asyncHandler(async (req, res) => {
  const [pedidoRows] = await pool.query('SELECT idUsu FROM pedidos WHERE idPed = ?', [req.params.idPed])
  if (pedidoRows.length === 0) return fail(res, 'Pedido no encontrado.', 404)
  if (req.user.rol !== 'admin' && pedidoRows[0].idUsu !== req.user.idUsu) {
    return fail(res, 'No tienes permiso para ver este envío.', 403)
  }

  const [rows] = await pool.query('SELECT * FROM envios WHERE idPed = ?', [req.params.idPed])
  if (rows.length === 0) return fail(res, 'Este pedido aún no tiene envío registrado.', 404)
  return ok(res, rows[0])
})

// PUT /api/envios/pedido/:idPed (admin) - carga o actualiza transportadora/guía/fecha estimada,
// igual que EnviosContext.upsertShipment del frontend
const upsertEnvio = asyncHandler(async (req, res) => {
  const { transportadora, numero_guia, fecha_estimada, estado_envio, telefono_contacto, idDir } = req.body

  const [existing] = await pool.query('SELECT idEnv FROM envios WHERE idPed = ?', [req.params.idPed])

  if (existing.length > 0) {
    await pool.query(
      `UPDATE envios SET
        transportadora = COALESCE(?, transportadora), numero_guia = COALESCE(?, numero_guia),
        fecha_estimada = COALESCE(?, fecha_estimada), estado_envio = COALESCE(?, estado_envio),
        telefono_contacto = COALESCE(?, telefono_contacto), idDir = COALESCE(?, idDir),
        fecha_envio = CASE WHEN ? = 'Enviado' AND fecha_envio IS NULL THEN NOW() ELSE fecha_envio END
       WHERE idPed = ?`,
      [transportadora, numero_guia, fecha_estimada, estado_envio, telefono_contacto, idDir, estado_envio, req.params.idPed]
    )
  } else {
    await pool.query(
      `INSERT INTO envios (idPed, idDir, transportadora, numero_guia, fecha_estimada, estado_envio, telefono_contacto)
       VALUES (?, ?, ?, ?, ?, COALESCE(?, 'Pendiente'), ?)`,
      [req.params.idPed, idDir || null, transportadora || null, numero_guia || null, fecha_estimada || null, estado_envio, telefono_contacto || null]
    )
  }

  const [rows] = await pool.query('SELECT * FROM envios WHERE idPed = ?', [req.params.idPed])
  return ok(res, rows[0])
})

module.exports = { getByPedido, upsertEnvio }
