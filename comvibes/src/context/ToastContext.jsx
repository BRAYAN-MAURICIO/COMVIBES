import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react'

const ToastContext = createContext(null)

const ICON_BY_TYPE = {
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
  error: XCircle,
}

const DEFAULT_TIMER = 2200

// Reemplaza los Swal.fire({ icon, title, text, timer, showConfirmButton: false })
// usados para confirmaciones menores (guardar, actualizar, eliminar, agregar al
// carrito, etc.). SweetAlert2 sigue existiendo para lo importante: confirmar
// compra, login/registro, y errores — cosas que sí ameritan interrumpir con un modal.
function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    ({ icon = 'success', title, text, timer = DEFAULT_TIMER }) => {
      const id = ++idRef.current
      setToasts((prev) => [...prev, { id, icon, title, text }])
      window.setTimeout(() => dismiss(id), timer)
      return id
    },
    [dismiss]
  )

  const toast = {
    success: (title, text) => showToast({ icon: 'success', title, text }),
    warning: (title, text) => showToast({ icon: 'warning', title, text }),
    info: (title, text) => showToast({ icon: 'info', title, text }),
    error: (title, text) => showToast({ icon: 'error', title, text }),
    fire: showToast, // acepta el mismo shape que Swal.fire para que el reemplazo sea directo
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className='toast-stack' aria-live='polite' aria-atomic='true'>
        {toasts.map((t) => {
          const Icon = ICON_BY_TYPE[t.icon] || CheckCircle2
          return (
            <div key={t.id} className={`app-toast app-toast--${t.icon}`} role='status'>
              <Icon size={18} className='app-toast__icon' />
              <div className='app-toast__body'>
                <p className='app-toast__title'>{t.title}</p>
                {t.text && <p className='app-toast__text'>{t.text}</p>}
              </div>
              <button
                type='button'
                className='app-toast__close'
                aria-label='Cerrar notificación'
                onClick={() => dismiss(t.id)}
              >
                ×
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast debe usarse dentro de un <ToastProvider>')
  }
  return context
}

export { ToastProvider, useToast }
