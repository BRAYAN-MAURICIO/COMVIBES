import { useEffect, useRef } from 'react'

function ConfirmModal({
  show,
  title = 'Confirmar acción',
  message = '¿Estás seguro de que deseas continuar?',
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  onConfirm,
  onCancel,
}) {
  const cancelButtonRef = useRef(null)

  // Mueve el foco al modal apenas se abre, y lo devuelve al cerrar
  // no es estrictamente necesario porque el elemento que lo abrió
  // sigue en el DOM, pero sí es buena práctica anunciar el diálogo.
  useEffect(() => {
    if (show) {
      cancelButtonRef.current?.focus()
    }
  }, [show])

  useEffect(() => {
    if (!show) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [show, onCancel])

  if (!show) return null

  return (
    <div
      className='position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center'
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
      role='dialog'
      aria-modal='true'
      aria-labelledby='confirm-modal-title'
      onClick={onCancel}
    >
      <div
        className='card border-0 rounded-4 shadow p-4'
        style={{ maxWidth: '420px', width: '90%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h5 id='confirm-modal-title' className='fw-bold mb-3'>
          {title}
        </h5>

        <p className='text-muted mb-4'>{message}</p>

        <div className='d-flex justify-content-end gap-2'>
          <button type='button' ref={cancelButtonRef} className='btn btn-outline-secondary' onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type='button' className={`btn btn-${variant}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal
