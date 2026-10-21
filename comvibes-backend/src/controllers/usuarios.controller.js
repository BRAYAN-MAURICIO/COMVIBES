const { pool } = require('../config/db')
const { ok, fail } = require('../utils/response')
const asyncHandler = require('../utils/asyncHandler')
const bcrypt = require('bcryptjs')
// FIX #8: reutilizar SELECT_USER_PLANO desde auth.controller para evitar duplicación.
// Si se agrega un campo a la query, solo hay que tocarlo en un lugar.
const { SELECT_USER_PLANO, getUsuarioPlano } = require('./auth.controller')
const { registrar } = require('../utils/auditoria')

// Ahora que requireAuth rechaza cuentas no activas (H1), un admin que se
// bloquea o se quita el rol a sí mismo se queda fuera del panel sin forma
// de volver a entrar. Estas acciones sobre la propia cuenta se rechazan.
const esUnoMismo = (req) => Number(req.params.id) === Number(req.user.idUsu)

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
  if (esUnoMismo(req)) return fail(res, 'No puedes cambiar tu propio rol.', 409)

  const [rolRows] = await pool.query('SELECT idRol FROM roles WHERE nombre = ?', [rol])
  if (rolRows.length === 0) return fail(res, `El rol '${rol}' no existe.`, 400)

  const previo = await getUsuarioPlano(req.params.id)
  if (!previo) return fail(res, 'Usuario no encontrado.', 404)

  // Borrar e insertar van en UNA transacción: antes eran dos consultas
  // sueltas y, si la segunda fallaba, el usuario quedaba sin ningún rol
  // (auditoría ISO, H17). Quitarle el rol al último admin no es posible:
  // quien hace el cambio es admin y no puede cambiarse a sí mismo.
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    await conn.query('DELETE FROM usuariorol WHERE idUsu = ?', [req.params.id])
    await conn.query('INSERT INTO usuariorol (idUsu, idRol) VALUES (?, ?)', [req.params.id, rolRows[0].idRol])
    await registrar(conn, req, {
      accion: 'usuario.rol', entidad: 'usuario', idEntidad: Number(req.params.id),
      antes: { rol: previo.rol }, despues: { rol },
    })
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }

  const [rows] = await pool.query(`${SELECT_USER_PLANO} WHERE u.idUsu = ?`, [req.params.id])
  return ok(res, rows[0])
})

// PATCH /api/usuarios/:id/estado (admin) - activo/inactivo/bloqueado
const cambiarEstado = asyncHandler(async (req, res) => {
  const { estado } = req.body
  const validos = ['activo', 'inactivo', 'bloqueado']
  if (!validos.includes(estado)) return fail(res, `estado debe ser uno de: ${validos.join(', ')}`)
  if (esUnoMismo(req)) return fail(res, 'No puedes cambiar el estado de tu propia cuenta.', 409)

  const previo = await getUsuarioPlano(req.params.id)
  if (!previo) return fail(res, 'Usuario no encontrado.', 404)

  await pool.query('UPDATE credencial SET estado = ? WHERE idUsu = ?', [estado, req.params.id])
  await registrar(pool, req, {
    accion: 'usuario.estado', entidad: 'usuario', idEntidad: Number(req.params.id),
    antes: { estado: previo.estado_cuenta }, despues: { estado },
  })
  const [rows] = await pool.query(`${SELECT_USER_PLANO} WHERE u.idUsu = ?`, [req.params.id])
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
  await registrar(pool, req, {
    accion: 'usuario.datos', entidad: 'usuario', idEntidad: Number(req.params.id),
    despues: { nombre, apellido, documento_id, fecha_nacimiento, genero },
  })
  return ok(res, rows[0])
})

const deleteUsuario = asyncHandler(async (req, res) => {
  // FIX #3: eliminar en orden para respetar FKs sin depender de CASCADE en el schema.
  // Pedidos e historial de pagos/facturas se conservan (pueden tener valor contable);
  // solo se limpian los datos de sesión y personales.
  const id = req.params.id

  if (esUnoMismo(req)) return fail(res, 'No puedes eliminar tu propia cuenta desde el panel.', 409)

  const previo = await getUsuarioPlano(id)
  if (!previo) return fail(res, 'Usuario no encontrado.', 404)

  // Auditoría ISO 2026-09-26, hallazgo H3. pedidos.idUsu y soporte.idUsu no
  // tienen cascada (a propósito: son historial contable y de atención), así
  // que borrar a un cliente con compras o PQR terminaba en un error genérico
  // de la BD. Ahora se explica y se ofrece la alternativa correcta: bloquear.
  const [[historial]] = await pool.query(
    `SELECT (SELECT COUNT(*) FROM pedidos WHERE idUsu = ?) AS pedidos,
            (SELECT COUNT(*) FROM soporte WHERE idUsu = ?) AS pqr`,
    [id, id]
  )
  const pedidos = Number(historial.pedidos)
  const pqr = Number(historial.pqr)
  if (pedidos > 0 || pqr > 0) {
    return fail(
      res,
      `Este usuario tiene ${pedidos} pedido(s) y ${pqr} PQR registrados, que se conservan como historial. ` +
        'Bloquéalo en lugar de eliminarlo.',
      409,
      { pedidos, pqr, sugerencia: 'bloquear' }
    )
  }

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
    // Los envíos apuntan a idDir con ON DELETE SET NULL (sql/04_integridad_fk.sql),
    // por lo que borrar la dirección no rompe el historial de pedidos.
    await conn.query('DELETE FROM direcciones WHERE idUsu = ?', [id])

    // Datos de identidad / acceso
    await conn.query('DELETE FROM usuariorol WHERE idUsu = ?', [id])
    await conn.query('DELETE FROM credencial WHERE idUsu = ?', [id])
    await conn.query('DELETE FROM usuarios WHERE idUsu = ?', [id])

    await registrar(conn, req, {
      accion: 'usuario.eliminar', entidad: 'usuario', idEntidad: Number(id),
      antes: { correo: previo?.correo, nombre: previo ? `${previo.nombre} ${previo.apellido}` : null },
    })
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
