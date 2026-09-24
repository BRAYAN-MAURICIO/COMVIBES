import { useState } from 'react'

// Selector con mini-formulario inline para crear el registro sin salir del
// formulario de producto. Se reutiliza para Categoría y Proveedor: solo
// cambian la etiqueta, el ícono y la función `onCreate`.
//
// Corresponde al <QuickCreateModal> que recomendó la auditoría cruzada
// (NC-3). Se dejó inline y no como modal para no cambiar la experiencia
// actual del panel de administración.
//
// `onCreate(nombre)` debe devolver una promesa: si se rechaza, el
// mini-formulario queda abierto con el texto para que se pueda reintentar.
function QuickCreateField({ id, label, icon: Icon, toggleText, placeholder, onCreate, children }) {
  const [abierto, setAbierto] = useState(false)
  const [nombre, setNombre] = useState('')
  const [guardando, setGuardando] = useState(false)

  const alternar = () => {
    setAbierto((v) => !v)
    setNombre('')
  }

  const crear = async () => {
    const limpio = nombre.trim()
    if (!limpio) return
    setGuardando(true)
    try {
      await onCreate(limpio)
      setNombre('')
      setAbierto(false)
    } catch {
      // El toast de error ya lo mostró onCreate.
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
      <div className='d-flex justify-content-between align-items-center mb-1'>
        <label htmlFor={id} className='form-label mb-0'>{label}</label>
        <button
          type='button'
          className='btn btn-link btn-sm p-0 d-flex align-items-center gap-1 text-decoration-none'
          onClick={alternar}
        >
          <Icon size={13} />
          <span style={{ fontSize: '0.78rem' }}>{abierto ? 'Cancelar' : toggleText}</span>
        </button>
      </div>

      {children}

      {abierto && (
        <div className='d-flex gap-2 mt-2'>
          <input
            type='text'
            className='form-control form-control-sm'
            placeholder={placeholder}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), crear())}
            autoFocus
          />
          <button
            type='button'
            className='btn btn-success btn-sm flex-shrink-0'
            onClick={crear}
            disabled={guardando || !nombre.trim()}
          >
            {guardando ? '…' : 'Crear'}
          </button>
        </div>
      )}
    </>
  )
}

export default QuickCreateField
