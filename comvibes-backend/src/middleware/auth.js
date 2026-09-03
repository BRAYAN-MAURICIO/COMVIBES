const { verifyToken } = require('../utils/jwt')
const { fail } = require('../utils/response')

// Lee el Bearer token, lo valida y cuelga el usuario decodificado en req.user.
// req.user = { idUsu, correo, rol }
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const [scheme, token] = header.split(' ')

  if (scheme !== 'Bearer' || !token) {
    return fail(res, 'No autenticado. Falta el token.', 401)
  }

  let decoded
  try {
    decoded = verifyToken(token)
  } catch (err) {
    return fail(res, 'Token inválido o expirado.', 401)
  }

  // FIX #6: verificar que el token no fue emitido antes del último cambio de
  // contraseña. Si el usuario cambió su contraseña después de que este token
  // fue firmado, lo invalidamos — aunque aún no haya expirado.
  try {
    const { pool } = require('../config/db')
    const [rows] = await pool.query(
      'SELECT password_changed_at FROM credencial WHERE idUsu = ?',
      [decoded.idUsu]
    )
    if (rows.length > 0 && rows[0].password_changed_at) {
      const changedAt = new Date(rows[0].password_changed_at).getTime() / 1000
      if (decoded.iat < changedAt) {
        return fail(res, 'Sesión expirada. Inicia sesión de nuevo.', 401)
      }
    }
  } catch (_) {
    // Si falla la consulta extra, no bloqueamos — seguimos con el token válido
  }

  req.user = decoded
  next()
}

// Debe usarse después de requireAuth. Corta el paso si el usuario no es admin.
function requireAdmin(req, res, next) {
  if (req.user?.rol !== 'admin') {
    return fail(res, 'No tienes permisos de administrador para esto.', 403)
  }
  next()
}

// Deja pasar si el usuario autenticado es admin O si es el dueño del recurso
// (compara req.user.idUsu contra un idUsu que venga en params o en el recurso ya cargado).
function requireOwnerOrAdmin(getOwnerId) {
  return (req, res, next) => {
    if (req.user?.rol === 'admin') return next()
    const ownerId = getOwnerId(req)
    if (Number(ownerId) === Number(req.user?.idUsu)) return next()
    return fail(res, 'No tienes permiso para acceder a este recurso.', 403)
  }
}

// Igual que requireAuth pero no corta el paso si no hay token o es inválido:
// solo intenta colgar req.user cuando puede. Sirve para endpoints públicos
// que se comportan distinto si hay sesión (ej. soporte: invitados pueden
// crear un ticket con su correo, pero si están logueados se asocia a su cuenta).
function optionalAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const [scheme, token] = header.split(' ')

  if (scheme === 'Bearer' && token) {
    try {
      req.user = verifyToken(token)
    } catch (err) {
      // token inválido/expirado: seguimos como invitado en vez de fallar
    }
  }
  next()
}

module.exports = { requireAuth, requireAdmin, requireOwnerOrAdmin, optionalAuth }
