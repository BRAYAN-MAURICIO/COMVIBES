const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const { pool } = require('../config/db')
const { signToken } = require('../utils/jwt')
const { ok, created, fail } = require('../utils/response')
const asyncHandler = require('../utils/asyncHandler')
const mailer = require('../utils/mailer')

const SELECT_USER_PLANO = `
  SELECT
    u.idUsu, u.nombre, u.apellido, u.documento_id, u.fecha_nacimiento, u.genero,
    c.correo, c.usuario, c.estado AS estado_cuenta, c.correo_verificado,
    r.nombre AS rol
  FROM usuarios u
  JOIN credencial c ON c.idUsu = u.idUsu
  LEFT JOIN usuariorol ur ON ur.idUsu = u.idUsu
  LEFT JOIN roles r ON r.idRol = ur.idRol
`

async function getUsuarioPlano(idUsu) {
  const [rows] = await pool.query(`${SELECT_USER_PLANO} WHERE u.idUsu = ? LIMIT 1`, [idUsu])
  return rows[0] || null
}

// ── Utilidades de códigos ───────────────────────────────────────────────────
// Los códigos de 6 dígitos se generan con crypto (no Math.random, que es
// predecible) y en la BD se guarda SOLO el hash bcrypt: leer la tabla no
// permite activar cuentas ni resetear contraseñas ajenas.

const CODIGO_TTL_MS = 10 * 60 * 1000 // 10 minutos
const MAX_INTENTOS = 5               // intentos fallidos por código antes de quemarlo

const generarCodigo = () => String(crypto.randomInt(100000, 1000000))
const hashCodigo = (codigo) => bcrypt.hash(codigo, 10)
const fechaExpiracion = () => new Date(Date.now() + CODIGO_TTL_MS)

/**
 * Busca el último código vivo de una tabla de códigos y lo compara.
 * Devuelve { valido, motivo, fila }.
 */
async function validarCodigo({ tabla, pk, idUsu, codigo }) {
  const [filas] = await pool.query(
    `SELECT ${pk} AS id, codigo_hash, intentos
       FROM ${tabla}
      WHERE idUsu = ? AND usado = FALSE AND expira_en > NOW()
      ORDER BY ${pk} DESC LIMIT 1`,
    [idUsu]
  )
  if (filas.length === 0) return { valido: false, motivo: 'expirado' }

  const fila = filas[0]
  if (fila.intentos >= MAX_INTENTOS) {
    await pool.query(`UPDATE ${tabla} SET usado = TRUE WHERE ${pk} = ?`, [fila.id])
    return { valido: false, motivo: 'agotado' }
  }

  const coincide = await bcrypt.compare(String(codigo), fila.codigo_hash)
  if (!coincide) {
    await pool.query(`UPDATE ${tabla} SET intentos = intentos + 1 WHERE ${pk} = ?`, [fila.id])
    return { valido: false, motivo: 'incorrecto' }
  }

  return { valido: true, fila }
}

// ── Registro ────────────────────────────────────────────────────────────────
// La cuenta se crea con correo_verificado = FALSE y NO se devuelve token:
// el usuario debe ingresar el código que le llega por correo. Si el envío
// del correo falla, se hace rollback y no queda una cuenta huérfana que
// nunca podría activarse.
const register = asyncHandler(async (req, res) => {
  const { nombre, apellido, correo, password, documento_id } = req.body

  if (!nombre || !apellido || !correo || !password) {
    return fail(res, 'nombre, apellido, correo y password son obligatorios.')
  }
  if (String(password).length < 8) {
    return fail(res, 'La contraseña debe tener mínimo 8 caracteres.')
  }

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    const [existing] = await conn.query(
      'SELECT idCred, correo_verificado FROM credencial WHERE correo = ?',
      [correo]
    )
    if (existing.length > 0) {
      await conn.rollback()
      // Si la cuenta existe pero nunca se verificó, guiamos al usuario en vez
      // de dejarlo bloqueado sin saber qué hacer.
      if (!existing[0].correo_verificado) {
        return fail(
          res,
          'Ya existe una cuenta con ese correo pendiente de verificar. Te enviamos un código nuevo desde la pantalla de verificación.',
          409,
          { requiereVerificacion: true }
        )
      }
      return fail(res, 'Ya existe una cuenta registrada con ese correo.', 409)
    }

    const [userResult] = await conn.query(
      'INSERT INTO usuarios (nombre, apellido, documento_id) VALUES (?, ?, ?)',
      [nombre, apellido, documento_id || null]
    )
    const idUsu = userResult.insertId

    const hash = await bcrypt.hash(password, 10)
    await conn.query(
      'INSERT INTO credencial (idUsu, correo, usuario, contrasena_hash, correo_verificado) VALUES (?, ?, ?, ?, FALSE)',
      [idUsu, correo, correo, hash]
    )

    const [rolCliente] = await conn.query("SELECT idRol FROM roles WHERE nombre = 'cliente' LIMIT 1")
    if (rolCliente.length === 0) throw new Error("No existe el rol 'cliente' en la tabla roles.")
    await conn.query('INSERT INTO usuariorol (idUsu, idRol) VALUES (?, ?)', [idUsu, rolCliente[0].idRol])

    // Carrito vacío listo desde el registro, para que CartContext siempre tenga dónde escribir.
    await conn.query('INSERT INTO carrito (idUsu) VALUES (?)', [idUsu])

    const codigo = generarCodigo()
    await conn.query(
      'INSERT INTO email_verifications (idUsu, codigo_hash, expira_en) VALUES (?, ?, ?)',
      [idUsu, await hashCodigo(codigo), fechaExpiracion()]
    )

    // El envío va ANTES del commit: si el correo no sale, no dejamos una
    // cuenta creada que el usuario jamás podría activar.
    await mailer.enviarCodigoVerificacion(correo, nombre, codigo)

    await conn.commit()

    return created(res, {
      requiereVerificacion: true,
      correo,
      mensaje: 'Te enviamos un código de 6 dígitos a tu correo para activar la cuenta.',
    })
  } catch (err) {
    await conn.rollback()
    if (err.esErrorDeCorreo) {
      console.error('[auth] Falló el envío del correo de verificación:', err.message)
      return fail(res, 'No pudimos enviar el correo de verificación. Revisa la dirección e inténtalo de nuevo.', 502)
    }
    // Cualquier otro error (BD, migración faltante, etc.) sube tal cual al
    // errorHandler: esconderlo detrás de "falló el correo" solo confunde.
    throw err
  } finally {
    conn.release()
  }
})

// ── Verificación de correo ──────────────────────────────────────────────────
// POST /api/auth/verify-email { correo, codigo }
// Al verificar correctamente se devuelve token: el usuario entra directo,
// sin tener que volver a escribir la contraseña.
const verifyEmail = asyncHandler(async (req, res) => {
  const { correo, codigo } = req.body
  if (!correo || !codigo) return fail(res, 'correo y codigo son obligatorios.')

  const [rows] = await pool.query(
    'SELECT idUsu, correo_verificado, estado FROM credencial WHERE correo = ?',
    [correo]
  )
  if (rows.length === 0) return fail(res, 'Código inválido o expirado.', 400)

  const cred = rows[0]
  if (cred.estado === 'bloqueado') return fail(res, 'Esta cuenta está bloqueada. Contacta al administrador.', 403)
  if (cred.correo_verificado) {
    return fail(res, 'Esta cuenta ya está verificada. Puedes iniciar sesión normalmente.', 409)
  }

  const { valido, motivo } = await validarCodigo({
    tabla: 'email_verifications',
    pk: 'idVer',
    idUsu: cred.idUsu,
    codigo,
  })

  if (!valido) {
    if (motivo === 'agotado') {
      return fail(res, 'Demasiados intentos con este código. Solicita uno nuevo.', 400)
    }
    return fail(res, 'Código inválido o expirado.', 400)
  }

  await pool.query(
    'UPDATE credencial SET correo_verificado = TRUE, fecha_verificacion = NOW() WHERE idUsu = ?',
    [cred.idUsu]
  )
  await pool.query('UPDATE email_verifications SET usado = TRUE WHERE idUsu = ?', [cred.idUsu])

  const usuario = await getUsuarioPlano(cred.idUsu)
  const token = signToken({ idUsu: usuario.idUsu, correo: usuario.correo, rol: usuario.rol })
  return ok(res, { usuario, token, mensaje: 'Cuenta verificada correctamente.' })
})

// POST /api/auth/resend-verification { correo }
// Respuesta genérica siempre: no revelamos si el correo existe ni si ya
// estaba verificado (evita enumerar cuentas).
const resendVerification = asyncHandler(async (req, res) => {
  const { correo } = req.body
  if (!correo) return fail(res, 'El correo es obligatorio.')

  const respuestaGenerica = {
    enviado: true,
    mensaje: 'Si la cuenta existe y está pendiente, te enviamos un código nuevo.',
  }

  const [rows] = await pool.query(
    `SELECT c.idUsu, c.correo_verificado, u.nombre
       FROM credencial c JOIN usuarios u ON u.idUsu = c.idUsu
      WHERE c.correo = ?`,
    [correo]
  )
  if (rows.length === 0 || rows[0].correo_verificado) return ok(res, respuestaGenerica)

  const { idUsu, nombre } = rows[0]
  const codigo = generarCodigo()

  await pool.query('UPDATE email_verifications SET usado = TRUE WHERE idUsu = ?', [idUsu])
  await pool.query(
    'INSERT INTO email_verifications (idUsu, codigo_hash, expira_en) VALUES (?, ?, ?)',
    [idUsu, await hashCodigo(codigo), fechaExpiracion()]
  )

  try {
    await mailer.enviarCodigoVerificacion(correo, nombre, codigo)
  } catch (err) {
    console.error('[auth] Falló el reenvío de verificación:', err.message)
    return fail(res, 'No pudimos enviar el correo en este momento. Inténtalo en unos minutos.', 502)
  }

  return ok(res, respuestaGenerica)
})

// ── Login ───────────────────────────────────────────────────────────────────
const login = asyncHandler(async (req, res) => {
  const { correo, password } = req.body
  if (!correo || !password) return fail(res, 'correo y password son obligatorios.')

  const [rows] = await pool.query(
    'SELECT idUsu, contrasena_hash, estado, correo_verificado FROM credencial WHERE correo = ?',
    [correo]
  )
  if (rows.length === 0) return fail(res, 'Correo o contraseña incorrectos.', 401)

  const cred = rows[0]
  if (cred.estado === 'bloqueado') return fail(res, 'Esta cuenta está bloqueada. Contacta al administrador.', 403)

  const match = await bcrypt.compare(password, cred.contrasena_hash)
  if (!match) return fail(res, 'Correo o contraseña incorrectos.', 401)

  // La verificación se comprueba DESPUÉS de la contraseña: así el mensaje
  // "falta verificar" solo lo ve quien realmente conoce las credenciales.
  if (!cred.correo_verificado) {
    return fail(
      res,
      'Tu cuenta aún no está verificada. Revisa tu correo e ingresa el código de 6 dígitos.',
      403,
      { requiereVerificacion: true, correo }
    )
  }

  await pool.query('UPDATE credencial SET ultimo_acceso = NOW() WHERE idUsu = ?', [cred.idUsu])

  const usuario = await getUsuarioPlano(cred.idUsu)
  const token = signToken({ idUsu: usuario.idUsu, correo: usuario.correo, rol: usuario.rol })
  return ok(res, { usuario, token })
})

const me = asyncHandler(async (req, res) => {
  const usuario = await getUsuarioPlano(req.user.idUsu)
  if (!usuario) return fail(res, 'Usuario no encontrado.', 404)
  return ok(res, usuario)
})

// ── Recuperación de contraseña ──────────────────────────────────────────────
// POST /api/auth/forgot-password { correo }
// El código YA NO se devuelve en la respuesta: viaja por correo y en la BD
// queda solo su hash. La respuesta es idéntica exista o no la cuenta.
const forgotPassword = asyncHandler(async (req, res) => {
  const { correo } = req.body
  if (!correo) return fail(res, 'El correo es obligatorio.')

  const respuestaGenerica = {
    enviado: true,
    mensaje: 'Si el correo está registrado, recibirás un código en tu bandeja de entrada.',
  }

  const [rows] = await pool.query(
    `SELECT u.idUsu, u.nombre, c.correo_verificado
       FROM usuarios u JOIN credencial c ON c.idUsu = u.idUsu
      WHERE c.correo = ?`,
    [correo]
  )
  if (rows.length === 0) return ok(res, respuestaGenerica)

  const { idUsu, nombre } = rows[0]
  const codigo = generarCodigo()

  // Invalidar códigos anteriores del mismo usuario
  await pool.query('UPDATE password_resets SET usado = TRUE WHERE idUsu = ?', [idUsu])
  await pool.query(
    'INSERT INTO password_resets (idUsu, codigo_hash, expira_en) VALUES (?, ?, ?)',
    [idUsu, await hashCodigo(codigo), fechaExpiracion()]
  )

  try {
    await mailer.enviarCodigoReset(correo, nombre, codigo)
  } catch (err) {
    console.error('[auth] Falló el envío del código de recuperación:', err.message)
    return fail(res, 'No pudimos enviar el correo en este momento. Inténtalo en unos minutos.', 502)
  }

  return ok(res, respuestaGenerica)
})

// POST /api/auth/reset-password { correo, codigo, passwordNueva }
const resetPassword = asyncHandler(async (req, res) => {
  const { correo, codigo, passwordNueva } = req.body
  if (!correo || !codigo || !passwordNueva) {
    return fail(res, 'correo, codigo y passwordNueva son obligatorios.')
  }
  if (passwordNueva.length < 8) {
    return fail(res, 'La nueva contraseña debe tener mínimo 8 caracteres.')
  }

  const [userRows] = await pool.query(
    'SELECT u.idUsu FROM usuarios u JOIN credencial c ON c.idUsu = u.idUsu WHERE c.correo = ?',
    [correo]
  )
  if (userRows.length === 0) return fail(res, 'Código inválido o expirado.', 400)

  const idUsu = userRows[0].idUsu
  const { valido, motivo, fila } = await validarCodigo({
    tabla: 'password_resets',
    pk: 'idReset',
    idUsu,
    codigo,
  })

  if (!valido) {
    if (motivo === 'agotado') {
      return fail(res, 'Demasiados intentos con este código. Solicita uno nuevo.', 400)
    }
    return fail(res, 'Código inválido o expirado.', 400)
  }

  const hash = await bcrypt.hash(passwordNueva, 10)
  // password_changed_at invalida los JWT emitidos antes del reset (requireAuth
  // compara el iat del token contra este timestamp).
  await pool.query(
    'UPDATE credencial SET contrasena_hash = ?, password_changed_at = NOW() WHERE idUsu = ?',
    [hash, idUsu]
  )
  await pool.query('UPDATE password_resets SET usado = TRUE WHERE idReset = ?', [fila.id])

  return ok(res, { mensaje: 'Contraseña actualizada correctamente.' })
})

module.exports = {
  register,
  login,
  me,
  getUsuarioPlano,
  SELECT_USER_PLANO,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
}
