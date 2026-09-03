import { useState, useEffect } from 'react'
import { Search, X } from 'lucide-react'

function SearchBar({ onSearch, placeholder = 'Buscar productos...', initialValue = '' }) {
  const [term, setTerm] = useState(initialValue)

  // Sincroniza el input cuando el padre limpia los filtros externamente
  useEffect(() => {
    setTerm(initialValue)
  }, [initialValue])

  const handleChange = (e) => {
    const value = e.target.value
    setTerm(value)
    onSearch(value)
  }

  const handleClear = () => {
    setTerm('')
    onSearch('')
  }

  return (
    <div className='input-group'>
      <span className='input-group-text bg-white border-end-0' aria-hidden='true'>
        <Search size={16} className='text-muted' />
      </span>
      <input
        type='search'
        className='form-control border-start-0 border-end-0'
        placeholder={placeholder}
        value={term}
        onChange={handleChange}
        aria-label='Buscar productos'
        autoComplete='off'
      />
      {term && (
        <button
          type='button'
          className='btn btn-outline-secondary border-start-0 d-flex align-items-center'
          onClick={handleClear}
          aria-label='Limpiar búsqueda'
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}

export default SearchBar
