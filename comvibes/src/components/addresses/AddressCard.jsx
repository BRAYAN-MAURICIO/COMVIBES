import { Pencil, Trash2, Star, MapPin } from 'lucide-react'

// mode='select' -> se usa en CheckoutFlow como tarjeta seleccionable (radio)
// mode='manage' -> se usa en UserProfile con acciones de editar/eliminar/predeterminar
function AddressCard({ address, mode = 'manage', selected = false, onSelect, onEdit, onDelete, onSetDefault }) {
  const isSelectable = mode === 'select'

  return (
    <div
      className={`card border rounded-4 p-3 h-100 ${isSelectable ? 'address-card--selectable' : ''} ${selected ? 'border-primary shadow-sm' : ''}`}
      role={isSelectable ? 'button' : undefined}
      onClick={isSelectable ? onSelect : undefined}
      style={isSelectable ? { cursor: 'pointer' } : undefined}
    >
      <div className='d-flex justify-content-between align-items-start'>
        <div className='d-flex align-items-center gap-2'>
          {isSelectable && (
            <input
              type='radio'
              className='form-check-input mt-0'
              checked={selected}
              onChange={onSelect}
              aria-label={`Seleccionar dirección ${address.etiqueta}`}
            />
          )}
          <span className='fw-bold d-flex align-items-center gap-1'>
            <MapPin size={14} className='text-primary' /> {address.etiqueta}
          </span>
          {address.predeterminada && (
            <span className='badge bg-primary-subtle text-primary d-flex align-items-center gap-1'>
              <Star size={11} /> Predeterminada
            </span>
          )}
        </div>

        {mode === 'manage' && (
          <div className='d-flex gap-1'>
            <button
              type='button'
              className='btn btn-sm btn-outline-secondary'
              onClick={() => onEdit(address)}
              aria-label='Editar dirección'
            >
              <Pencil size={13} />
            </button>
            <button
              type='button'
              className='btn btn-sm btn-outline-danger'
              onClick={() => onDelete(address)}
              aria-label='Eliminar dirección'
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>

      <p className='mb-1 small mt-2'>{address.direccion}</p>
      <p className='mb-1 small text-muted'>{[address.ciudad, address.departamento].filter(Boolean).join(', ')}</p>
      <p className='mb-0 small text-muted'>Tel: {address.telefono}</p>

      {mode === 'manage' && !address.predeterminada && (
        <button
          type='button'
          className='btn btn-link btn-sm px-0 mt-2 text-start'
          onClick={() => onSetDefault(address)}
        >
          Usar como predeterminada
        </button>
      )}
    </div>
  )
}

export default AddressCard
