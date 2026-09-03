import { useState } from 'react'
import { Mail, MessageCircle, Clock, Send, Inbox, UserCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useSupport } from '../context/SupportContext'
import { useToast } from '../context/ToastContext'
import { required, isEmail, maxLength, runValidations } from '../utils/validators'
import { formatDate } from '../utils/formatters'
import Breadcrumbs from '../components/ui/Breadcrumbs'
import EmptyState from '../components/ui/EmptyState'

const MAX_MESSAGE_LENGTH = 500

const initialForm = { nombre: '', correo: '', asunto: '', mensaje: '' }

const STATUS_STYLE = {
  Abierto: 'bg-warning-subtle text-warning',
  'En Progreso': 'bg-primary-subtle text-primary',
  Cerrado: 'bg-success-subtle text-success',
}

function Support() {
  const { user } = useAuth()
  const { tickets, createTicket } = useSupport()
  const toast = useToast()

  const [form, setForm] = useState({
    ...initialForm,
    nombre: user ? `${user.nombre} ${user.apellido}` : '',
    correo: user?.correo || '',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  // El backend ya devuelve solo los tickets del usuario autenticado — no hace falta filtrar
  const misTickets = user ? tickets : []

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  // nombre y correo solo son obligatorios para invitados — cuando hay sesión,
  // el backend los toma del token y los inputs ni siquiera se muestran.
  // Validarlos siempre causaría errores invisibles si el user tiene esos
  // campos vacíos por algún edge case (nombre '' en BD, correo malformado).
  const validate = () => {
    const rules = {
      asunto: [form.asunto, [(v) => required(v, 'El asunto')]],
      mensaje: [
        form.mensaje,
        [(v) => required(v, 'El mensaje'), (v) => maxLength(v, MAX_MESSAGE_LENGTH, 'El mensaje')],
      ],
    }
    if (!user) {
      rules.nombre = [form.nombre, [(v) => required(v, 'El nombre')]]
      rules.correo = [form.correo, [(v) => required(v, 'El correo'), isEmail]]
    }
    return runValidations(rules)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const validationErrors = validate()
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setLoading(true)
    try {
      // Con sesión, el backend toma cliente/correo del token e ignora estos
      // campos; sin sesión los usa para poder responderle al invitado.
      await createTicket({
        asunto: form.asunto,
        descripcion: form.mensaje,
        nombre: form.nombre,
        correo: form.correo,
      })
      toast.success('Solicitud enviada', 'Nuestro equipo te responderá pronto')
      setForm({ ...initialForm, nombre: form.nombre, correo: form.correo })
    } catch (err) {
      toast.error('No se pudo enviar tu solicitud', err.message)
    } finally {
      setLoading(false)
    }
  }

  const infoItems = [
    { icon: Mail, label: 'Email', value: 'soporte@comvibes.com' },
    { icon: MessageCircle, label: 'WhatsApp', value: '+57 300 123 4567' },
    { icon: Clock, label: 'Horario', value: '8:00 AM - 6:00 PM' },
  ]

  return (
    <div className='container py-5'>
      <Breadcrumbs items={[{ label: 'Soporte' }]} />

      <h1 className='fw-bold text-primary mb-1'>Centro de Soporte</h1>
      <p className='text-muted mb-5'>¿Tienes una petición, queja o reclamo? Cuéntanos.</p>

      <div className='row g-4'>
        <div className='col-md-7'>
          <div className='card shadow border-0 rounded-4 p-4'>
            <h5 className='fw-bold mb-4'>Contáctanos</h5>

            {!user && (
              <p className='text-muted small mb-3'>
                No necesitas una cuenta para escribirnos — solo confirma bien tu correo para que podamos responderte.
              </p>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className='row'>
                <div className='col-md-6 mb-3'>
                  <label htmlFor='nombre' className='form-label'>Nombre</label>
                  <input
                    id='nombre'
                    name='nombre'
                    type='text'
                    className={`form-control ${errors.nombre ? 'is-invalid' : ''}`}
                    value={form.nombre}
                    onChange={handleChange}
                  />
                  {errors.nombre && <div className='invalid-feedback'>{errors.nombre}</div>}
                </div>

                <div className='col-md-6 mb-3'>
                  <label htmlFor='correo' className='form-label'>Correo</label>
                  <input
                    id='correo'
                    name='correo'
                    type='email'
                    className={`form-control ${errors.correo ? 'is-invalid' : ''}`}
                    value={form.correo}
                    onChange={handleChange}
                  />
                  {errors.correo && <div className='invalid-feedback'>{errors.correo}</div>}
                </div>
              </div>

              <div className='mb-3'>
                <label htmlFor='asunto' className='form-label'>Asunto</label>
                <input
                  id='asunto'
                  name='asunto'
                  type='text'
                  className={`form-control ${errors.asunto ? 'is-invalid' : ''}`}
                  placeholder='Resumen breve de tu solicitud'
                  value={form.asunto}
                  onChange={handleChange}
                />
                {errors.asunto && <div className='invalid-feedback'>{errors.asunto}</div>}
              </div>

              <div className='mb-1'>
                <label htmlFor='mensaje' className='form-label'>Mensaje</label>
                <textarea
                  id='mensaje'
                  name='mensaje'
                  className={`form-control ${errors.mensaje ? 'is-invalid' : ''}`}
                  rows='5'
                  placeholder='Cuéntanos qué necesitas...'
                  value={form.mensaje}
                  maxLength={MAX_MESSAGE_LENGTH}
                  onChange={handleChange}
                ></textarea>
                {errors.mensaje && <div className='invalid-feedback'>{errors.mensaje}</div>}
              </div>
              <p className='text-muted small text-end mb-3'>
                {form.mensaje.length}/{MAX_MESSAGE_LENGTH}
              </p>

              <button type='submit' className='btn btn-primary d-flex align-items-center gap-2' disabled={loading}>
                <Send size={16} />
                {loading ? 'Enviando...' : 'Enviar'}
              </button>
            </form>
          </div>

          {user && (
            <div className='card shadow border-0 rounded-4 p-4 mt-4'>
              <h5 className='fw-bold mb-4 d-flex align-items-center gap-2'>
                <Inbox size={18} /> Mis solicitudes
              </h5>

              {misTickets.length === 0 ? (
                <EmptyState
                  variant='support'
                  title='Sin solicitudes aún'
                  description='Cuando envíes una solicitud de soporte aparecerá aquí.'
                />
              ) : (
                <div className='d-flex flex-column gap-3'>
                  {misTickets.map((ticket) => (
                    <div key={ticket.idTick} className='border rounded-3 p-3'>
                      <div className='d-flex justify-content-between align-items-start gap-2 mb-1'>
                        <span className='fw-semibold'>{ticket.asunto}</span>
                        <span className={`badge ${STATUS_STYLE[ticket.estado]}`}>{ticket.estado}</span>
                      </div>
                      <small className='text-muted d-block mb-2'>{formatDate(ticket.fecha_creacion)}</small>
                      <p className='small mb-0'>{ticket.descripcion}</p>
                      {ticket.respuesta_admin && (
                        <div className='bg-light rounded-3 p-3 mt-2 small'>
                          <div className='fw-semibold mb-1'>Respuesta</div>
                          {/* pre-wrap: el asesor escribe en un textarea, así que
                              los saltos de línea de su respuesta se respetan. */}
                          <p className='mb-0' style={{ whiteSpace: 'pre-wrap' }}>{ticket.respuesta_admin}</p>
                          {ticket.asesor && ticket.fecha_respuesta && (
                            <p className='text-muted mt-2 mb-0 d-flex align-items-center gap-1'>
                              <UserCheck size={13} />
                              {ticket.asesor} · {formatDate(ticket.fecha_respuesta)}
                            </p>
                          )}
                        </div>
                      )}
                      {ticket.estado === 'En Progreso' && ticket.respuesta_admin && (
                        <p className='small text-muted mt-2 mb-0'>
                          Seguimos atentos: si la respuesta no resolvió tu caso, escríbenos de nuevo
                          y seguimos sobre esta misma solicitud.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className='col-md-5'>
          <div className='card shadow border-0 rounded-4 p-4'>
            <h5 className='fw-bold mb-4'>Información</h5>

            <div className='d-flex flex-column gap-3'>
              {infoItems.map((item) => {
                const Icon = item.icon
                return (
                  <div className='d-flex align-items-center gap-3' key={item.label}>
                    <div className='order-row__icon'>
                      <Icon size={18} />
                    </div>
                    <div>
                      <small className='text-muted d-block'>{item.label}</small>
                      <span className='fw-semibold'>{item.value}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Support
