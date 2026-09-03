import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { useProducts } from '../../context/ProductsContext'
import { formatCurrency } from '../../utils/formatters'
import ProductImage from '../products/ProductImage'

const MAX_RESULTS = 5

function NavbarSearch({ onNavigate }) {
  const { productos } = useProducts()
  const [term, setTerm] = useState('')
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)
  const navigate = useNavigate()

  const results = useMemo(() => {
    if (!term.trim()) return []
    const query = term.trim().toLowerCase()
    return productos
      .filter((p) => p.activo && p.nombre.toLowerCase().includes(query))
      .slice(0, MAX_RESULTS)
  }, [productos, term])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const goToCatalogSearch = () => {
    if (!term.trim()) return
    navigate(`/catalogo?buscar=${encodeURIComponent(term.trim())}`)
    setOpen(false)
    onNavigate?.()
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    goToCatalogSearch()
  }

  const handleSelectProduct = () => {
    setOpen(false)
    setTerm('')
    onNavigate?.()
  }

  return (
    <div className='navbar-search' ref={wrapperRef}>
      <form onSubmit={handleSubmit} className='input-group input-group-sm'>
        <span className='input-group-text bg-white border-end-0'>
          <Search size={14} className='text-muted' />
        </span>
        <input
          type='search'
          className='form-control border-start-0'
          placeholder='Buscar productos...'
          value={term}
          onChange={(e) => { setTerm(e.target.value); setOpen(true) }}
          onFocus={() => term && setOpen(true)}
          aria-label='Buscar productos en toda la tienda'
        />
        {term && (
          <button
            type='button'
            className='btn btn-outline-secondary'
            onClick={() => { setTerm(''); setOpen(false) }}
            aria-label='Limpiar búsqueda'
          >
            <X size={14} />
          </button>
        )}
      </form>

      {open && term.trim() && (
        <div className='navbar-search__dropdown'>
          {results.length === 0 ? (
            <p className='text-muted small px-3 py-2 mb-0'>Sin resultados para "{term}"</p>
          ) : (
            <>
              {results.map((product) => (
                <Link
                  key={product.idPro}
                  to={`/producto/${product.idPro}`}
                  className='navbar-search__item'
                  onClick={handleSelectProduct}
                >
                  <ProductImage
                    src={product.imagen}
                    alt={product.nombre}
                    className='rounded-2'
                    style={{ width: '36px', height: '36px', objectFit: 'cover' }}
                    iconSize={14}
                  />
                  <span className='flex-grow-1 text-truncate'>{product.nombre}</span>
                  <span className='fw-semibold small text-primary'>{formatCurrency(product.precio)}</span>
                </Link>
              ))}
              <button type='button' className='navbar-search__seeall' onClick={goToCatalogSearch}>
                Ver todos los resultados para "{term}"
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default NavbarSearch
