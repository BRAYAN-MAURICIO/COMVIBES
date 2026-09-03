/**
 * Servicio de correo real (Nodemailer).
 *
 * Cubre tres flujos: verificación de cuenta al registrarse, recuperación de
 * contraseña y respuesta/cierre de PQR. Reemplaza la simulación anterior,
 * donde el código de recuperación se devolvía en la respuesta HTTP y el
 * frontend lo mostraba en un modal.
 *
 * Configuración por .env (valores por defecto pensados para Gmail):
 *   SMTP_HOST=smtp.gmail.com
 *   SMTP_PORT=465
 *   SMTP_SECURE=true
 *   SMTP_USER=tucuenta@gmail.com
 *   SMTP_PASS=<contraseña de aplicación de 16 caracteres, sin espacios>
 *   MAIL_FROM="ComVibes <tucuenta@gmail.com>"
 *   APP_URL=http://localhost:5173
 *
 * Para Gmail hace falta una "Contraseña de aplicación":
 *   Cuenta de Google → Seguridad → Verificación en 2 pasos (activarla)
 *   → Contraseñas de aplicaciones → generar una para "Correo".
 * La contraseña normal de la cuenta NO funciona.
 *
 * Escape de desarrollo: con MAIL_TRANSPORT=console no se envía nada y el
 * correo se imprime en la terminal del backend. Sirve para trabajar sin
 * internet; NUNCA debe quedar así en la entrega/producción.
 */

const nodemailer = require('nodemailer')

const MARCA = 'ComVibes'
const COLOR = '#6d28d9'

let transporter = null

function modoConsola() {
  return process.env.MAIL_TRANSPORT === 'console'
}

function estaConfigurado() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS)
}

function getTransporter() {
  if (transporter) return transporter

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    // 465 => SSL directo (secure true). 587 => STARTTLS (secure false).
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : Number(process.env.SMTP_PORT || 465) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: (process.env.SMTP_PASS || '').replace(/\s/g, ''), // Google muestra la clave en grupos de 4
    },
  })

  return transporter
}

/**
 * Comprueba la conexión SMTP al arrancar el servidor. No tumba el proceso si
 * falla: solo avisa en consola, para que el resto del API siga funcionando.
 */
async function verificarConexion() {
  if (modoConsola()) {
    console.warn('[mailer] MAIL_TRANSPORT=console — los correos se imprimen en la terminal, no se envían.')
    return false
  }
  if (!estaConfigurado()) {
    console.warn('[mailer] SMTP_USER/SMTP_PASS sin definir — el registro y la recuperación de contraseña fallarán.')
    return false
  }
  try {
    await getTransporter().verify()
    console.log(`[mailer] SMTP listo (${process.env.SMTP_HOST || 'smtp.gmail.com'} como ${process.env.SMTP_USER})`)
    return true
  } catch (err) {
    console.error('[mailer] No se pudo conectar al servidor SMTP:', err.message)
    return false
  }
}

async function enviar({ to, subject, html, text }) {
  if (modoConsola()) {
    console.log('\n──────── CORREO (modo consola) ────────')
    console.log('Para:    ', to)
    console.log('Asunto:  ', subject)
    console.log(text || html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
    console.log('───────────────────────────────────────\n')
    return { simulado: true }
  }

  if (!estaConfigurado()) {
    const err = new Error('El servicio de correo no está configurado en el servidor (falta SMTP_USER/SMTP_PASS).')
    err.esErrorDeCorreo = true
    throw err
  }

  const from = process.env.MAIL_FROM || `${MARCA} <${process.env.SMTP_USER}>`
  try {
    return await getTransporter().sendMail({ from, to, subject, html, text })
  } catch (err) {
    // Marca explícita: quien llama distingue "falló el SMTP" de cualquier
    // otro error (de BD, por ejemplo) sin adivinar por el texto del mensaje.
    err.esErrorDeCorreo = true
    throw err
  }
}

// ── Plantillas ──────────────────────────────────────────────────────────────

function cascaron(contenido) {
  return `
<!doctype html>
<html lang="es">
<body style="margin:0;padding:24px;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;color:#1f2937">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="max-width:520px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06)">
        <tr>
          <td style="background:${COLOR};padding:22px 28px">
            <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:.5px">${MARCA}</span>
          </td>
        </tr>
        <tr><td style="padding:28px">${contenido}</td></tr>
        <tr>
          <td style="padding:16px 28px;background:#fafafa;border-top:1px solid #eee;font-size:12px;color:#9ca3af">
            Este es un correo automático, por favor no respondas a este mensaje.<br>
            © ${new Date().getFullYear()} ${MARCA}
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim()
}

// Escapa el texto que escribe una persona antes de meterlo en el HTML del
// correo: sin esto, un "<" en la respuesta del asesor rompe la maquetación.
function esc(texto = '') {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Respeta los saltos de línea que el asesor escribió en el textarea.
const conSaltos = (texto = '') => esc(texto).replace(/\r?\n/g, '<br>')

/** Plantilla con un código grande en el centro (verificación y reset). */
function plantillaBase({ titulo, saludo, cuerpo, codigo, pie }) {
  return cascaron(`
    <h1 style="margin:0 0 14px;font-size:19px;color:#111827">${titulo}</h1>
    <p style="margin:0 0 10px;font-size:15px;line-height:1.6">${saludo}</p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6">${cuerpo}</p>
    <div style="margin:0 0 20px;padding:18px;text-align:center;background:#f5f3ff;border:1px dashed ${COLOR};border-radius:10px">
      <div style="font-size:32px;font-weight:700;letter-spacing:.35em;color:${COLOR}">${codigo}</div>
      <div style="margin-top:6px;font-size:12px;color:#6b7280">Válido por 10 minutos</div>
    </div>
    <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280">${pie}</p>
  `)
}

/**
 * Plantilla de mensaje: título, saludo y una lista de bloques citados.
 * La usa el módulo de PQR para mostrar la consulta original y la respuesta
 * del asesor una debajo de la otra.
 */
function plantillaMensaje({ titulo, saludo, intro, bloques = [], pie, cta }) {
  const cuerpoBloques = bloques
    .map(
      (b) => `
    <div style="margin:0 0 14px;padding:14px 16px;background:${b.destacado ? '#f5f3ff' : '#f8fafc'};border-left:3px solid ${b.destacado ? COLOR : '#cbd5e1'};border-radius:0 8px 8px 0">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:${b.destacado ? COLOR : '#64748b'};margin-bottom:6px">${esc(b.etiqueta)}</div>
      <div style="font-size:15px;line-height:1.6;color:#1f2937">${conSaltos(b.texto)}</div>
    </div>`
    )
    .join('')

  const boton = cta
    ? `<p style="margin:22px 0 0"><a href="${cta.url}" style="display:inline-block;padding:11px 22px;background:${COLOR};color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">${esc(cta.texto)}</a></p>`
    : ''

  return cascaron(`
    <h1 style="margin:0 0 14px;font-size:19px;color:#111827">${esc(titulo)}</h1>
    <p style="margin:0 0 10px;font-size:15px;line-height:1.6">${saludo}</p>
    <p style="margin:0 0 18px;font-size:15px;line-height:1.6">${intro}</p>
    ${cuerpoBloques}
    <p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:#6b7280">${pie}</p>
    ${boton}
  `)
}

/** Código de 6 dígitos para activar una cuenta recién registrada. */
function enviarCodigoVerificacion(correo, nombre, codigo) {
  return enviar({
    to: correo,
    subject: `${codigo} es tu código para activar tu cuenta en ${MARCA}`,
    text: `Hola ${nombre}. Tu código para activar tu cuenta en ${MARCA} es ${codigo}. Vence en 10 minutos.`,
    html: plantillaBase({
      titulo: 'Activa tu cuenta',
      saludo: `Hola <strong>${nombre}</strong>,`,
      cuerpo: `Gracias por registrarte en ${MARCA}. Ingresa este código en la pantalla de verificación para activar tu cuenta:`,
      codigo,
      pie: 'Si no creaste esta cuenta puedes ignorar este correo: la cuenta no se activará sin el código.',
    }),
  })
}

/** Código de 6 dígitos para restablecer la contraseña. */
function enviarCodigoReset(correo, nombre, codigo) {
  return enviar({
    to: correo,
    subject: `${codigo} es tu código para recuperar tu contraseña en ${MARCA}`,
    text: `Hola ${nombre}. Tu código para restablecer tu contraseña en ${MARCA} es ${codigo}. Vence en 10 minutos.`,
    html: plantillaBase({
      titulo: 'Recupera tu contraseña',
      saludo: `Hola <strong>${nombre}</strong>,`,
      cuerpo: 'Recibimos una solicitud para restablecer tu contraseña. Ingresa este código en la pantalla de recuperación:',
      codigo,
      pie: 'Si no fuiste tú, ignora este correo: tu contraseña actual sigue siendo válida y nadie puede cambiarla sin este código.',
    }),
  })
}

// ── PQR / Soporte ───────────────────────────────────────────────────────────

const urlSoporte = () => `${process.env.APP_URL || 'http://localhost:5173'}/soporte`

/**
 * Avisa al cliente que su PQR fue respondida.
 * `asesor` es el nombre de quien atendió; si no se conoce, se firma como
 * "Equipo de soporte" en vez de dejar el correo sin autor.
 */
function enviarRespuestaPQR({ correo, cliente, idTick, asunto, descripcion, respuesta, asesor, estado }) {
  const firma = asesor || 'Equipo de soporte'
  const enProgreso = estado !== 'Cerrado'

  const pie = enProgreso
    ? 'Tu solicitud sigue <strong>en progreso</strong>: la dejamos abierta por si la respuesta no resolvió tu caso. Si necesitas agregar algo, respóndenos desde la sección de soporte y seguimos por ahí.'
    : 'Con esta respuesta damos por cerrada tu solicitud. Si el tema vuelve a presentarse, puedes abrir una nueva desde la sección de soporte.'

  return enviar({
    to: correo,
    subject: `Respuesta a tu PQR #${idTick} — ${asunto}`,
    text:
      `Hola ${cliente}.\n\n` +
      `Respondimos tu solicitud #${idTick} (${asunto}):\n\n${respuesta}\n\n` +
      `Atendida por ${firma}.\n` +
      (enProgreso
        ? 'Tu solicitud sigue en progreso; si necesitas agregar algo, escríbenos desde la sección de soporte.'
        : 'Con esta respuesta damos por cerrada tu solicitud.') +
      `\n${urlSoporte()}`,
    html: plantillaMensaje({
      titulo: `Respuesta a tu PQR #${idTick}`,
      saludo: `Hola <strong>${esc(cliente)}</strong>,`,
      intro: `Revisamos tu solicitud y esto es lo que encontramos. La atendió <strong>${esc(firma)}</strong>.`,
      bloques: [
        { etiqueta: `Tu solicitud — ${asunto}`, texto: descripcion },
        { etiqueta: 'Nuestra respuesta', texto: respuesta, destacado: true },
      ],
      pie,
      cta: { url: urlSoporte(), texto: 'Ver mis solicitudes' },
    }),
  })
}

/** Avisa al cliente que su PQR quedó cerrada. */
function enviarCierrePQR({ correo, cliente, idTick, asunto, respuesta, asesor }) {
  const firma = asesor || 'Equipo de soporte'
  const bloques = [{ etiqueta: `Solicitud — ${asunto}`, texto: `PQR #${idTick}` }]
  if (respuesta) bloques.push({ etiqueta: 'Última respuesta', texto: respuesta, destacado: true })

  return enviar({
    to: correo,
    subject: `Cerramos tu PQR #${idTick} — ${asunto}`,
    text:
      `Hola ${cliente}.\n\nDamos por cerrada tu solicitud #${idTick} (${asunto}).\n` +
      (respuesta ? `\nÚltima respuesta:\n${respuesta}\n` : '') +
      `\nAtendida por ${firma}.\nSi el tema vuelve a presentarse, abre una nueva desde ${urlSoporte()}`,
    html: plantillaMensaje({
      titulo: `Cerramos tu PQR #${idTick}`,
      saludo: `Hola <strong>${esc(cliente)}</strong>,`,
      intro: `Damos por cerrada tu solicitud. La atendió <strong>${esc(firma)}</strong>.`,
      bloques,
      pie: 'Si el tema vuelve a presentarse, puedes abrir una nueva solicitud cuando quieras.',
      cta: { url: urlSoporte(), texto: 'Ir a soporte' },
    }),
  })
}

module.exports = {
  enviar,
  enviarCodigoVerificacion,
  enviarCodigoReset,
  enviarRespuestaPQR,
  enviarCierrePQR,
  verificarConexion,
  estaConfigurado,
  modoConsola,
}
