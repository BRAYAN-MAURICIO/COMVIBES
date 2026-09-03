import { Search } from 'lucide-react'

// Barra reutilizada por las 4 tablas admin: buscador + slot para filtros
// propios de cada módulo + contador de resultados.
function AdminTableToolbar({ searchValue, onSearchChange, placeholder = 'Buscar...', resultCount, children }) {
  return (
    <div className='d-flex flex-wrap align-items-center gap-3 mb-4'>
      <div className='input-group' style={{ maxWidth: '320px' }}>
        <span className='input-group-text bg-white border-end-0'>
          <Search size={16} className='text-muted' />
        </span>
        <input
          type='search'
          className='form-control border-start-0'
          placeholder={placeholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label={placeholder}
        />
      </div>

      {children}

      {typeof resultCount === 'number' && (
        <span className='text-muted small ms-auto'>{resultCount} resultado(s)</span>
      )}
    </div>
  )
}

export default AdminTableToolbar
