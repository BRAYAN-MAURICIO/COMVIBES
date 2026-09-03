const { pool } = require('../config/db')
const { ok, created, fail } = require('../utils/response')
const asyncHandler = require('../utils/asyncHandler')
const { crearNotificacion } = require('./notificaciones.controller')
const mailer = require('../utils/mailer')

const SELECT_TICKETS = `
  SELECT t.idTick, t.idUsu,
         COALESCE(CONCAT(u.nombre, ' ', u.apellido), t.guest_nombre) AS cliente,
         COALESCE(c.correo, t.guest_correo) AS correo,
         t.asunto, t.descripcion, t.respuesta_admin, t.estado,
         t.atendido_por,
         CONCAT(a.nombre, ' ', a.apellido) AS asesor,
         t.fecha_creacion, t.fecha_respuesta, t.fecha_resolucion
  FROM soporte t
  LEFT JOIN usuarios u ON u.idUsu = t.idUsu
  LEFT JOIN credencial c ON c.idUsu = t.idUsu
  LEFT JOIN usuarios a ON a.idUsu = t.atendido_por
`

const ESTADOS_VALIDOS = ['Abierto', 'En Progreso', 'Cerrado']

async function getTicket(idTick) {
  const [rows] = await pool.query(`${SELECT_TICKETS} WHERE t.idTick = ?`, [idTick])
  return rows[0] || null
}

// GET /api/soporte - propios, o todos si es admin
// (los tickets de invitados, sin idUsu, solo los ve el admin: un invitado no
// tiene cómo "iniciar sesión" para reclamarlos, así que no aparecen en
// ninguna vista de "mis solicitudes")
const listTickets = asyncHandler(async (req, res) => {
  let query = SELECT_TICKETS
  const params = []
  if (req.user.rol !== 'admin') {
    query += ' WHERE t.idUsu = ?'
    params.push(req.user.idUsu)
  }
  query += ' ORDER BY t.fecha_creacion DESC'
  const [rows] = await pool.query(query, params)
  return ok(res, rows)
})

// POST /api/soporte { asunto, descripcion, nombre?, correo? }
// Con sesión: el ticket se asocia a la cuenta (nombre/correo se ignoran, se
// usan los del token). Sin sesión: nombre y correo son obligatorios, así el
// admin sabe a quién responder aunque no haya cuenta creada.
const createTicket = asyncHandler(async (req, res) => {
  const { asunto, descripcion, nombre, correo } = req.body
  if (!asunto || !descripcion) return fail(res, 'asunto y descripcion son obligatorios.')

  if (req.user) {
    const [result] = await pool.query(
      "INSERT INTO soporte (idUsu, asunto, descripcion, estado) VALUES (?, ?, ?, 'Abierto')",
      [req.user.idUsu, asunto, descripcion]
    )
    return created(res, await getTicket(result.insertId))
  }

  if (!nombre || !correo) {
    return fail(res, 'nombre y correo son obligatorios para enviar tu solicitud sin iniciar sesión.')
  }

  const [result] = await pool.query(
    "INSERT INTO soporte (idUsu, guest_nombre, guest_correo, asunto, descripcion, estado) VALUES (NULL, ?, ?, ?, ?, 'Abierto')",
    [nombre, correo, asunto, descripcion]
  )
  return created(res, await getTicket(result.insertId))
})

// PATCH /api/soporte/:id/responder (admin) { respuesta_admin, estado? }
//
// Responder ya NO cierra el ticket. Por defecto lo deja 'En Progreso': el
// cliente puede no quedar conforme con la respuesta, y cerrarlo de una
// obligaba a abrir una PQR nueva para seguir la misma conversación. El cierre
// es ahora una acción aparte y explícita (PATCH /:id/estado con 'Cerrado').
//
// Al guardar la respuesta se le envía un correo al cliente con el texto
// completo. Si el envío falla, la respuesta YA quedó guardada: se responde 200
// con correo_enviado = false para que el panel avise, en vez de un error que
// haga pensar al asesor que se perdió lo que escribió.
const responderTicket = asyncHandler(async (req, res) => {
  const { respuesta_admin, estado = 'En Progreso' } = req.body

  if (!respuesta_admin || !String(respuesta_admin).trim()) {
    return fail(res, 'respuesta_admin es obligatoria.')
  }
  if (!ESTADOS_VALIDOS.includes(estado)) {
    return fail(res, `estado debe ser uno de: ${ESTADOS_VALIDOS.join(', ')}`)
  }

  const previo = await getTicket(req.params.id)
  if (!previo) return fail(res, 'Ticket no encontrado.', 404)

  const respuesta = String(respuesta_admin).trim()

  await pool.query(
    `UPDATE soporte
        SET respuesta_admin  = ?,
            estado           = ?,
            atendido_por     = ?,
            fecha_respuesta  = NOW(),
            fecha_resolucion = CASE WHEN ? = 'Cerrado' THEN NOW() ELSE fecha_resolucion END
      WHERE idTick = ?`,
    [respuesta, estado, req.user.idUsu, estado, req.params.id]
  )

  const ticket = await getTicket(req.params.id)

  // Los tickets de invitados tienen idUsu = null: no hay a quién notificar
  // dentro de la app, pero sí hay correo al que escribirle.
  if (ticket.idUsu) {
    await crearNotificacion({
      idUsu: ticket.idUsu,
      tipo: 'soporte',
      mensaje: `Respondimos tu PQR #${req.params.id}.`,
      link: '/soporte',
    })
  }

  let correo_enviado = false
  let aviso_correo = null

  if (!ticket.correo) {
    aviso_correo = 'El ticket no tiene un correo asociado, así que no se pudo avisar al cliente.'
  } else {
    try {
      await mailer.enviarRespuestaPQR({
        correo: ticket.correo,
        cliente: ticket.cliente || 'cliente',
        idTick: ticket.idTick,
        asunto: ticket.asunto,
        descripcion: ticket.descripcion,
        respuesta,
        asesor: ticket.asesor,
        estado: ticket.estado,
      })
      correo_enviado = true
    } catch (err) {
      console.error(`[soporte] No se pudo enviar la respuesta de la PQR #${req.params.id}:`, err.message)
      aviso_correo = 'La respuesta se guardó, pero el correo al cliente no salió. Revisa la configuración SMTP.'
    }
  }

  return ok(res, { ...ticket, correo_enviado, aviso_correo })
})

// PATCH /api/soporte/:id/estado (admin) - cambia solo el estado, sin tocar la respuesta.
// Al pasar a 'Cerrado' se le avisa al cliente por correo, porque el cierre es
// el final del trámite y merece el mismo aviso que la respuesta.
const cambiarEstadoTicket = asyncHandler(async (req, res) => {
  const { estado } = req.body
  if (!ESTADOS_VALIDOS.includes(estado)) {
    return fail(res, `estado debe ser uno de: ${ESTADOS_VALIDOS.join(', ')}`)
  }

  const previo = await getTicket(req.params.id)
  if (!previo) return fail(res, 'Ticket no encontrado.', 404)

  await pool.query(
    `UPDATE soporte
        SET estado = ?,
            fecha_resolucion = CASE WHEN ? = 'Cerrado' THEN NOW() ELSE fecha_resolucion END
      WHERE idTick = ?`,
    [estado, estado, req.params.id]
  )

  const ticket = await getTicket(req.params.id)

  let correo_enviado = false
  let aviso_correo = null

  // Solo se avisa en la transición hacia 'Cerrado', no cada vez que se guarda
  // un ticket que ya estaba cerrado.
  const seAcabaDeCerrar = estado === 'Cerrado' && previo.estado !== 'Cerrado'

  if (seAcabaDeCerrar) {
    if (ticket.idUsu) {
      await crearNotificacion({
        idUsu: ticket.idUsu,
        tipo: 'soporte',
        mensaje: `Cerramos tu PQR #${req.params.id}.`,
        link: '/soporte',
      })
    }

    if (ticket.correo) {
      try {
        await mailer.enviarCierrePQR({
          correo: ticket.correo,
          cliente: ticket.cliente || 'cliente',
          idTick: ticket.idTick,
          asunto: ticket.asunto,
          respuesta: ticket.respuesta_admin,
          asesor: ticket.asesor,
        })
        correo_enviado = true
      } catch (err) {
        console.error(`[soporte] No se pudo enviar el cierre de la PQR #${req.params.id}:`, err.message)
        aviso_correo = 'El ticket se cerró, pero el correo al cliente no salió. Revisa la configuración SMTP.'
      }
    }
  }

  return ok(res, { ...ticket, correo_enviado, aviso_correo })
})

module.exports = { listTickets, createTicket, responderTicket, cambiarEstadoTicket }
