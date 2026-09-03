import { Star } from 'lucide-react'

// Modo lectura (readOnly=true, por defecto): muestra `value` estrellas llenas.
// Modo selección: pasa `onChange` para permitir hacer clic y elegir 1-5.
function StarRating({ value = 0, onChange, readOnly = true, size = 16 }) {
  const stars = [1, 2, 3, 4, 5]

  return (
    <div className='d-inline-flex align-items-center gap-1' role={readOnly ? 'img' : 'radiogroup'} aria-label={`Calificación: ${value} de 5 estrellas`}>
      {stars.map((star) => (
        <button
          key={star}
          type='button'
          className='star-rating__star'
          style={{ cursor: readOnly ? 'default' : 'pointer' }}
          onClick={() => !readOnly && onChange?.(star)}
          disabled={readOnly}
          aria-label={`${star} estrella${star > 1 ? 's' : ''}`}
          tabIndex={readOnly ? -1 : 0}
        >
          <Star
            size={size}
            fill={star <= Math.round(value) ? '#F59E0B' : 'none'}
            color={star <= Math.round(value) ? '#F59E0B' : '#D1D5DB'}
          />
        </button>
      ))}
    </div>
  )
}

export default StarRating
