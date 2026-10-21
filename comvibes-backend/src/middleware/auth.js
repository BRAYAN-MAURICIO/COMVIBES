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
  } catch {
    return fail(res, 'Token inválido o expirado.', 401)
  }

  // Un token bien firmado no basta: la cuenta tiene que seguir existiendo y
  // estar activa. Sin esta consulta, bloquear a un usuario desde el panel no
  // tenía efecto hasta que su token caducara (hasta 7 días). Auditoría ISO
  // 2026-09-26, hallazgo H1.
  let cuenta
  try {
    const { pool } = require('../config/db')
    // El rol se lee de la BD, no del token: si un admin le quita el rol a
    // otro, el token viejo seguía diciendo 'admin' hasta caducar (7 días).
    const [rows] = await pool.query(
      `SELECT c.estado, c.password_changed_at, r.nombre AS rol
         FROM credencial c
         LEFT JOIN usuariorol ur ON ur.idUsu = c.idUsu
         LEFT JOIN roles r ON r.idRol = ur.idRol
        WHERE c.idUsu = ?
        LIMIT 1`,
      [decoded.idUsu]
    )
    cuenta = rows[0]
  } catch (err) {
    // Antes este catch dejaba pasar la petición. Si no podemos comprobar la
    // cuenta, es más seguro negar el acceso que concederlo (H12).
    console.error('[auth] No se pudo validar la cuenta del token:', err.message)
    return fail(res, 'No pudimos validar tu sesión en este momento. Intenta de nuevo.', 503)
  }

  if (!cuenta) {
    return fail(res, 'La cuenta de esta sesión ya no existe.', 401)
  }
  if (cuenta.estado !== 'activo') {
    return fail(res, 'Tu cuenta no está activa. Contacta al administrador.', 403, {
      estadoCuenta: cuenta.estado,
    })
  }

  // FIX #6: un token emitido antes del último cambio de contraseña ya no vale,
  // aunque todavía no haya expirado.
  if (cuenta.password_changed_at) {
    const changedAt = new Date(cuenta.password_changed_at).getTime() / 1000
    if (decoded.iat < changedAt) {
      return fail(res, 'Sesión expirada. Inicia sesión de nuevo.', 401)
    }
  }

  // El rol vigente reemplaza al del token (que puede estar desactualizado).
  req.user = { ...decoded, rol: cuenta.rol }
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
    } catch {
      // token inválido/expirado: seguimos como invitado en vez de fallar
    }
  }
  next()
}

module.exports = { requireAuth, requireAdmin, requireOwnerOrAdmin, optionalAuth }
