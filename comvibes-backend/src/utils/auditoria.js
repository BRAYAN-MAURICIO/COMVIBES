// Bitácora de acciones administrativas (tabla auditoria_admin, migración
// sql/05_auditoria_admin.sql). Auditoría ISO 2026-09-26, hallazgo H12:
// ISO/IEC 27001 A.8.15 pide registrar quién hizo qué y cuándo; antes, si un
// admin bloqueaba a un cliente, cambiaba un precio o cancelaba un pedido, no
// quedaba rastro.
//
// Uso:
//   await registrar(conn, req, { accion: 'pedido.estado', entidad: 'pedido',
//                                idEntidad: 12, antes: {...}, despues: {...} })
//
// - Con una CONEXIÓN de transacción (`conn`), el registro es parte de la
//   misma transacción: si el INSERT falla, se revierte todo y no queda un
//   cambio sin rastro.
// - Con el `pool` (operaciones sin transacción) el registro es "mejor
//   esfuerzo": si falla, se avisa en consola pero no se rompe la acción que
//   ya se hizo.
// - En los dos casos, si la tabla todavía no existe (no se corrió la
//   migración 05), solo se avisa: olvidar una migración no debe tumbar el
//   panel de pedidos. app.js también lo advierte al arrancar.
const { pool } = require('../config/db')

function ipDe(req) {
  return (req.ip || req.socket?.remoteAddress || '').slice(0, 45) || null
}

async function registrar(db, req, { accion, entidad, idEntidad = null, antes = null, despues = null }) {
  const detalle = antes || despues ? JSON.stringify({ antes, despues }) : null
  const sql =
    'INSERT INTO auditoria_admin (idUsu, accion, entidad, id_entidad, detalle, ip) VALUES (?, ?, ?, ?, ?, ?)'
  const valores = [req.user?.idUsu ?? null, accion, entidad, idEntidad, detalle, ipDe(req)]

  try {
    await db.query(sql, valores)
  } catch (err) {
    const enTransaccion = db !== pool
    if (enTransaccion && err.code !== 'ER_NO_SUCH_TABLE') throw err
    console.error(`[auditoria] No se pudo registrar "${accion}":`, err.message)
  }
}

module.exports = { registrar }
