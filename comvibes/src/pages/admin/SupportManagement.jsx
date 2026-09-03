import { useState, useMemo } from 'react'
import { useToast } from '../../context/ToastContext'
import { Search, MessageSquare, ChevronDown, ChevronUp, Send, CheckCircle2, Mail, MailWarning, UserCheck } from 'lucide-react'
import { useSupport } from '../../context/SupportContext'
import { formatDate } from '../../utils/formatters'

const ESTADOS = ['Abierto', 'En Progreso', 'Cerrado']

const STATUS_STYLE = {
  Abierto: 'bg-warning-subtle text-warning',
  'En Progreso': 'bg-primary-subtle text-primary',
  Cerrado: 'bg-success-subtle text-success',
}

function SupportManagement() {
  const toast = useToast()
  const { tickets, responderTicket, cambiarEstado, cerrarTicket } = useSupport()
  const [search, setSearch] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [draftRespuesta, setDraftRespuesta] = useState('')
  const [enviando, setEnviando] = useState(false)

  const filteredTickets = useMemo(() => {
    let result = tickets
    if (estadoFiltro) {
      result = result.filter((t) => t.estado === estadoFiltro)
    }
    if (search.trim()) {
      const term = search.trim().toLowerCase()
      result = result.filter(
        (t) => t.asunto.toLowerCase().includes(term) || (t.cliente || '').toLowerCase().includes(term)
      )
    }
    return result
  }, [tickets, search, estadoFiltro])

  const toggleExpand = (ticket) => {
    if (expandedId === ticket.idTick) {
      setExpandedId(null)
      return
    }
    setExpandedId(ticket.idTick)
    setDraftRespuesta(ticket.respuesta_admin || '')
  }

  const handleEstadoChange = async (idTick, estado) => {
    try {
      const t = await cambiarEstado(idTick, estado)
      if (estado === 'Cerrado' && t.aviso_correo) {
        toast.warning('PQR cerrada, sin correo', t.aviso_correo)
      } else if (estado === 'Cerrado' && t.correo_enviado) {
        toast.success('PQR cerrada', 'Se le avisó al cliente por correo')
      } else {
        toast.success('Estado actualizado')
      }
    } catch (err) {
      toast.error('No se pudo actualizar el estado', err.message)
    }
  }

  // Responder NO cierra el ticket: lo deja En Progreso para que el cliente
  // pueda replicar sobre la misma solicitud. Cerrar es el botón de al lado.
  const handleEnviarRespuesta = async (idTick) => {
    if (!draftRespuesta.trim()) {
      toast.warning('Escribe una respuesta', 'El mensaje no puede estar vacío')
      return
    }
    setEnviando(true)
    try {
      const t = await responderTicket(idTick, draftRespuesta.trim())
      if (t.correo_enviado) {
        toast.success('Respuesta enviada', `Le llegó un correo a ${t.correo}`)
      } else {
        toast.warning('Respuesta guardada, sin correo', t.aviso_correo || 'No se pudo avisar al cliente.')
      }
    } catch (err) {
      toast.error('No se pudo enviar la respuesta', err.message)
    } finally {
      setEnviando(false)
    }
  }

  const handleCerrar = async (idTick) => {
    try {
      const t = await cerrarTicket(idTick)
      if (t.aviso_correo) {
        toast.warning('PQR cerrada, sin correo', t.aviso_correo)
      } else {
        toast.success('PQR cerrada', t.correo_enviado ? 'Se le avisó al cliente por correo' : undefined)
      }
    } catch (err) {
      toast.error('No se pudo cerrar la PQR', err.message)
    }
  }

  return (
    <div className='container py-5'>
      <div className='admin-page-header'>
        <h1 className='admin-page-header__title'>💬 Soporte (PQR)</h1>
        <p className='admin-page-header__sub'>Gestiona las solicitudes de soporte de los clientes</p>
        <div className='admin-page-header__badges'>
          <span className='admin-badge'>📊 Total: {tickets.length}</span>
          <span className='admin-badge'>🔓 Abiertos: {tickets.filter(t=>t.estado==='Abierto').length}</span>
          <span className='admin-badge'>🔄 En Progreso: {tickets.filter(t=>t.estado==='En Progreso').length}</span>
          <span className='admin-badge'>✅ Cerrados: {tickets.filter(t=>t.estado==='Cerrado').length}</span>
        </div>
      </div>

      <div className='card border-0 shadow-sm rounded-4'>
        <div className='p-3 border-bottom d-flex flex-wrap gap-2 align-items-center'>
          <div className='input-group' style={{ maxWidth: '280px' }}>
            <span className='input-group-text bg-white border-end-0'>
              <Search size={16} className='text-muted' />
            </span>
            <input
              type='search'
              className='form-control border-start-0'
              placeholder='Buscar por asunto o cliente...'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label='Buscar solicitudes de soporte'
            />
          </div>

          <select
            className='form-select'
            style={{ maxWidth: '180px' }}
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            aria-label='Filtrar por estado'
          >
            <option value=''>Todos los estados</option>
            {ESTADOS.map((estado) => (
              <option key={estado} value={estado}>{estado}</option>
            ))}
          </select>
        </div>

        {filteredTickets.length === 0 ? (
          <div className='text-center text-muted py-5'>
            <MessageSquare size={28} className='mb-2 d-block mx-auto' />
            No hay solicitudes que coincidan con el filtro.
          </div>
        ) : (
          <div className='d-flex flex-column'>
            {filteredTickets.map((ticket) => {
              const isExpanded = expandedId === ticket.idTick
              const cerrado = ticket.estado === 'Cerrado'

              return (
                <div key={ticket.idTick} className='border-bottom'>
                  <button
                    type='button'
                    className='order-row'
                    onClick={() => toggleExpand(ticket)}
                    aria-expanded={isExpanded}
                  >
                    <div className='order-row__icon'>
                      <MessageSquare size={18} />
                    </div>

                    <div className='order-row__info'>
                      <div className='fw-semibold text-truncate'>
                        <span className='text-muted me-2'>#{ticket.idTick}</span>{ticket.asunto}
                      </div>
                      <small className='text-muted'>{ticket.cliente} · {formatDate(ticket.fecha_creacion)}</small>
                    </div>

                    <span className={`badge ${STATUS_STYLE[ticket.estado]}`}>{ticket.estado}</span>

                    <span className='d-none d-md-inline' />

                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>

                  {isExpanded && (
                    <div className='px-4 pb-4'>
                      <p className='small text-muted mb-2'>{ticket.descripcion}</p>

                      {ticket.correo ? (
                        <p className='small text-muted mb-3 d-flex align-items-center gap-1'>
                          <Mail size={13} /> La respuesta se le envía a <strong>{ticket.correo}</strong>
                        </p>
                      ) : (
                        <p className='small text-danger mb-3 d-flex align-items-center gap-1'>
                          <MailWarning size={13} /> Este ticket no tiene correo asociado: no se le puede avisar al cliente.
                        </p>
                      )}

                      {/* Quién lo atendió y cuándo */}
                      {ticket.asesor && ticket.fecha_respuesta && (
                        <p className='small text-muted mb-3 d-flex align-items-center gap-1'>
                          <UserCheck size={13} />
                          Respondida por <strong>{ticket.asesor}</strong> el {formatDate(ticket.fecha_respuesta)}
                        </p>
                      )}

                      <div className='row g-3'>
                        <div className='col-md-3'>
                          <label className='form-label small'>Estado</label>
                          <select
                            className='form-select form-select-sm'
                            value={ticket.estado}
                            onChange={(e) => handleEstadoChange(ticket.idTick, e.target.value)}
                          >
                            {ESTADOS.map((estado) => (
                              <option key={estado} value={estado}>{estado}</option>
                            ))}
                          </select>
                        </div>

                        <div className='col-md-9'>
                          <label className='form-label small' htmlFor={`resp-${ticket.idTick}`}>
                            Respuesta para el cliente
                          </label>
                          <textarea
                            id={`resp-${ticket.idTick}`}
                            className='form-control form-control-sm'
                            rows={4}
                            placeholder='Escribe la respuesta completa. Se le envía por correo tal como la escribas, respetando los saltos de línea.'
                            value={draftRespuesta}
                            onChange={(e) => setDraftRespuesta(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className='d-flex flex-wrap gap-2 mt-3'>
                        <button
                          className='btn btn-primary btn-sm d-flex align-items-center gap-2'
                          onClick={() => handleEnviarRespuesta(ticket.idTick)}
                          disabled={enviando}
                        >
                          <Send size={15} />
                          {enviando ? 'Enviando...' : 'Enviar respuesta al cliente'}
                        </button>

                        {!cerrado && (
                          <button
                            className='btn btn-outline-success btn-sm d-flex align-items-center gap-2'
                            onClick={() => handleCerrar(ticket.idTick)}
                          >
                            <CheckCircle2 size={15} />
                            Cerrar PQR
                          </button>
                        )}
                      </div>

                      <p className='small text-muted mt-2 mb-0'>
                        Enviar la respuesta deja la solicitud <strong>En Progreso</strong>, no la cierra:
                        el cliente puede replicar sobre la misma PQR. Ciérrala cuando el caso esté resuelto.
                      </p>

                      {ticket.fecha_resolucion && cerrado && (
                        <small className='text-muted d-block mt-2'>
                          Cerrada el {formatDate(ticket.fecha_resolucion)}
                        </small>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default SupportManagement
