const { pool } = require('../config/db')
const { ok, fail } = require('../utils/response')
const asyncHandler = require('../utils/asyncHandler')
const bcrypt = require('bcryptjs')
// FIX #8: reutilizar SELECT_USER_PLANO desde auth.controller para evitar duplicación.
// Si se agrega un campo a la query, solo hay que tocarlo en un lugar.
const { SELECT_USER_PLANO, getUsuarioPlano } = require('./auth.controller')

// GET /api/usuarios (admin) - para UserManagement
const listUsuarios = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`${SELECT_USER_PLANO} ORDER BY u.idUsu DESC`)
  return ok(res, rows)
})

const getUsuario = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`${SELECT_USER_PLANO} WHERE u.idUsu = ?`, [req.params.id])
  if (rows.length === 0) return fail(res, 'Usuario no encontrado.', 404)
  return ok(res, rows[0])
})

// PATCH /api/usuarios/:id/rol (admin) - cambia el rol (admin/cliente)
const cambiarRol = asyncHandler(async (req, res) => {
  const { rol } = req.body
  if (!rol) return fail(res, 'rol es obligatorio.')

  const [rolRows] = await pool.query('SELECT idRol FROM roles WHERE nombre = ?', [rol])
  if (rolRows.length === 0) return fail(res, `El rol '${rol}' no existe.`, 400)

  await pool.query('DELETE FROM usuariorol WHERE idUsu = ?', [req.params.id])
  await pool.query('INSERT INTO usuariorol (idUsu, idRol) VALUES (?, ?)', [req.params.id, rolRows[0].idRol])

  const [rows] = await pool.query(`${SELECT_USER_PLANO} WHERE u.idUsu = ?`, [req.params.id])
  return ok(res, rows[0])
})

// PATCH /api/usuarios/:id/estado (admin) - activo/inactivo/bloqueado
const cambiarEstado = asyncHandler(async (req, res) => {
  const { estado } = req.body
  const validos = ['activo', 'inactivo', 'bloqueado']
  if (!validos.includes(estado)) return fail(res, `estado debe ser uno de: ${validos.join(', ')}`)

  await pool.query('UPDATE credencial SET estado = ? WHERE idUsu = ?', [estado, req.params.id])
  const [rows] = await pool.query(`${SELECT_USER_PLANO} WHERE u.idUsu = ?`, [req.params.id])
  if (rows.length === 0) return fail(res, 'Usuario no encontrado.', 404)
  return ok(res, rows[0])
})

const updateUsuario = asyncHandler(async (req, res) => {
  const { nombre, apellido, documento_id, fecha_nacimiento, genero } = req.body
  await pool.query(
    'UPDATE usuarios SET nombre = COALESCE(?, nombre), apellido = COALESCE(?, apellido), documento_id = COALESCE(?, documento_id), fecha_nacimiento = COALESCE(?, fecha_nacimiento), genero = COALESCE(?, genero) WHERE idUsu = ?',
    [nombre, apellido, documento_id, fecha_nacimiento, genero, req.params.id]
  )
  const [rows] = await pool.query(`${SELECT_USER_PLANO} WHERE u.idUsu = ?`, [req.params.id])
  if (rows.length === 0) return fail(res, 'Usuario no encontrado.', 404)
  return ok(res, rows[0])
})

const deleteUsuario = asyncHandler(async (req, res) => {
  // FIX #3: eliminar en orden para respetar FKs sin depender de CASCADE en el schema.
  // Pedidos e historial de pagos/facturas se conservan (pueden tener valor contable);
  // solo se limpian los datos de sesión y personales.
  const id = req.params.id

  const [exists] = await pool.query('SELECT idUsu FROM usuarios WHERE idUsu = ?', [id])
  if (exists.length === 0) return fail(res, 'Usuario no encontrado.', 404)

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    // Datos de actividad del usuario (no contables)
    await conn.query('DELETE FROM lista_deseos WHERE idUsu = ?', [id])
    await conn.query(
      'DELETE dc FROM detallecarrito dc JOIN carrito c ON c.idCar = dc.idCar WHERE c.idUsu = ?',
      [id]
    )
    await conn.query('DELETE FROM carrito WHERE idUsu = ?', [id])
    await conn.query('DELETE FROM notificaciones WHERE idUsu = ?', [id])
    await conn.query('DELETE FROM password_resets WHERE idUsu = ?', [id])
    // Las direcciones deben borrarse antes de usuarios para respetar la FK.
    // Los envíos apuntan a idDir con ON DELETE SET NULL (migración 01_schema_updates.sql),
    // por lo que borrar la dirección no rompe el historial de pedidos.
    await conn.query('DELETE FROM direcciones WHERE idUsu = ?', [id])

    // Datos de identidad / acceso
    await conn.query('DELETE FROM usuariorol WHERE idUsu = ?', [id])
    await conn.query('DELETE FROM credencial WHERE idUsu = ?', [id])
    await conn.query('DELETE FROM usuarios WHERE idUsu = ?', [id])

    await conn.commit()
    return ok(res, { deleted: true })
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
})

// PATCH /api/usuarios/mi-perfil/password — el propio usuario cambia su contraseña
const cambiarPassword = asyncHandler(async (req, res) => {
  const { passwordActual, passwordNueva } = req.body
  if (!passwordActual || !passwordNueva) {
    return fail(res, 'passwordActual y passwordNueva son obligatorios.')
  }
  if (passwordNueva.length < 8) {
    return fail(res, 'La nueva contraseña debe tener mínimo 8 caracteres.')
  }

  const [rows] = await pool.query('SELECT contrasena_hash FROM credencial WHERE idUsu = ?', [req.user.idUsu])
  if (rows.length === 0) return fail(res, 'Usuario no encontrado.', 404)

  const coincide = await bcrypt.compare(passwordActual, rows[0].contrasena_hash)
  if (!coincide) return fail(res, 'La contraseña actual no es correcta.', 401)

  const hash = await bcrypt.hash(passwordNueva, 10)
  // FIX #6: guardamos la fecha del cambio para que requireAuth pueda invalidar
  // tokens emitidos ANTES de este momento (ver middleware/auth.js).
  // Esto cierra la ventana en la que un atacante con un token robado seguiría
  // con acceso después de que el dueño cambie su contraseña.
  await pool.query(
    'UPDATE credencial SET contrasena_hash = ?, password_changed_at = NOW() WHERE idUsu = ?',
    [hash, req.user.idUsu]
  )
  return ok(res, { mensaje: 'Contraseña actualizada correctamente.' })
})

// PUT /api/usuarios/mi-perfil — el propio usuario edita su nombre/apellido/documento_id
const actualizarPerfil = asyncHandler(async (req, res) => {
  const { nombre, apellido, documento_id, fecha_nacimiento, genero } = req.body
  await pool.query(
    `UPDATE usuarios SET
      nombre = COALESCE(?, nombre), apellido = COALESCE(?, apellido),
      documento_id = COALESCE(?, documento_id),
      fecha_nacimiento = COALESCE(?, fecha_nacimiento),
      genero = COALESCE(?, genero)
     WHERE idUsu = ?`,
    [nombre, apellido, documento_id, fecha_nacimiento, genero, req.user.idUsu]
  )
  const [rows] = await pool.query(`${SELECT_USER_PLANO} WHERE u.idUsu = ?`, [req.user.idUsu])
  return ok(res, rows[0])
})

module.exports = { listUsuarios, getUsuario, cambiarRol, cambiarEstado, updateUsuario, deleteUsuario, cambiarPassword, actualizarPerfil }
