import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Package, MessageSquare, CheckCheck } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useNotifications } from '../../context/NotificationsContext'
import { formatDate } from '../../utils/formatters'

const ICON_BY_TYPE = {
  pedido: Package,
  soporte: MessageSquare,
}

function NotificationsBell() {
  const { user } = useAuth()
  const { getByUser, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  const notificaciones = getByUser()
  const noLeidas = unreadCount()

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleClickNotification = (notificacion) => {
    markAsRead(notificacion.idNot)
    setOpen(false)
    if (notificacion.link) navigate(notificacion.link)
  }

  return (
    <div className='account-menu' ref={ref}>
      <button
        type='button'
        className='btn btn-outline-light btn-sm position-relative d-flex align-items-center justify-content-center'
        style={{ width: '34px', height: '34px' }}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup='true'
        aria-label='Notificaciones'
      >
        <Bell size={16} />
        {noLeidas > 0 && (
          <span
            className='badge bg-danger rounded-pill position-absolute'
            style={{ top: '-4px', right: '-4px', fontSize: '0.65rem' }}
          >
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>

      {open && (
        <div className='account-menu__dropdown notifications-dropdown'>
          <div className='d-flex justify-content-between align-items-center px-1 pb-2 mb-1 border-bottom'>
            <span className='fw-bold small'>Notificaciones</span>
            {noLeidas > 0 && (
              <button
                type='button'
                className='btn btn-link btn-sm p-0 d-flex align-items-center gap-1'
                onClick={() => markAllAsRead()}
              >
                <CheckCheck size={13} /> Marcar todas
              </button>
            )}
          </div>

          {notificaciones.length === 0 ? (
            <p className='text-muted small text-center mb-0 py-3'>No tienes notificaciones.</p>
          ) : (
            <div className='d-flex flex-column' style={{ maxHeight: '320px', overflowY: 'auto' }}>
              {notificaciones.map((notificacion) => {
                const Icon = ICON_BY_TYPE[notificacion.tipo] || Bell
                return (
                  <button
                    type='button'
                    key={notificacion.idNot}
                    className={`notification-item ${notificacion.leida ? '' : 'notification-item--unread'}`}
                    onClick={() => handleClickNotification(notificacion)}
                  >
                    <Icon size={16} className='text-primary flex-shrink-0 mt-1' />
                    <div className='text-start'>
                      <p className='mb-0 small'>{notificacion.mensaje}</p>
                      <small className='text-muted'>{formatDate(notificacion.fecha)}</small>
                    </div>
                    {!notificacion.leida && <span className='notification-item__dot' />}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default NotificationsBell
