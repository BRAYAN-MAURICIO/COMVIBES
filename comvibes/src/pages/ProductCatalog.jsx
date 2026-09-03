import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import ProductCard from '../components/products/ProductCard'
import ProductCardSkeleton from '../components/ui/ProductCardSkeleton'
import SearchBar from '../components/products/SearchBar'
import ProductFilters from '../components/products/ProductFilters'
import Breadcrumbs from '../components/ui/Breadcrumbs'
import EmptyState from '../components/ui/EmptyState'
import Pagination from '../components/ui/Pagination'
import { useCategories } from '../context/CategoriesContext'
import { getCatalogo } from '../api/productos'

const PAGE_SIZE = 9
const DEBOUNCE_MS = 350

function ProductCatalog() {
  const { categorias } = useCategories()
  const [searchParams, setSearchParams] = useSearchParams()

  // ─── Estado derivado de los URL params ────────────────────────────────────
  const [searchTerm, setSearchTerm]       = useState(searchParams.get('buscar') || '')
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm)
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get('categoria') ? Number(searchParams.get('categoria')) : null
  )
  const [sortBy, setSortBy]   = useState(searchParams.get('orden') || 'newest')
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('pagina')) || 1)

  // ─── Resultado del servidor ───────────────────────────────────────────────
  const [productos, setProductos]   = useState([])
  const [total, setTotal]           = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)

  // ─── Debounce del término de búsqueda ─────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [searchTerm])

  // ─── Llamada al backend ────────────────────────────────────────────────────
  // Se dispara cada vez que cambia cualquier filtro o la página.
  // El debounce garantiza que no se haga una petición por cada letra.
  const fetchProductos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {
        page: currentPage,
        limit: PAGE_SIZE,
        sortBy,
        ...(debouncedSearch.trim() && { search: debouncedSearch.trim() }),
        ...(selectedCategory && { categoria: selectedCategory }),
      }
      const res = await getCatalogo(params)
      setProductos(res.productos || [])
      setTotal(res.total || 0)
      setTotalPages(res.totalPages || 1)
    } catch (err) {
      setError('No se pudieron cargar los productos.')
      setProductos([])
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, selectedCategory, sortBy, currentPage])

  useEffect(() => {
    fetchProductos()
  }, [fetchProductos])

  // ─── Sincronizar URL params ─────────────────────────────────────────────
  // La URL refleja el estado actual de los filtros para que el usuario
  // pueda compartir o guardar el enlace y volver al mismo resultado.
  useEffect(() => {
    const params = {}
    if (debouncedSearch.trim()) params.buscar = debouncedSearch.trim()
    if (selectedCategory)       params.categoria = String(selectedCategory)
    if (sortBy !== 'newest')    params.orden = sortBy
    if (currentPage > 1)        params.pagina = String(currentPage)
    setSearchParams(params, { replace: true })
  }, [debouncedSearch, selectedCategory, sortBy, currentPage, setSearchParams])

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleSearch = (term) => {
    setSearchTerm(term)
    setCurrentPage(1)   // volver a la primera página al buscar
  }

  const handleSelectCategory = (idCat) => {
    setSelectedCategory(idCat)
    setCurrentPage(1)
  }

  const handleSort = (order) => {
    setSortBy(order)
    setCurrentPage(1)
  }

  const handlePageChange = (page) => {
    setCurrentPage(page)
    // Scroll suave hacia arriba al cambiar de página
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const categoriaActual = categorias.find((c) => c.idCat === selectedCategory)

  return (
    <div className='container py-5'>
      <Breadcrumbs
        items={[
          { label: 'Catálogo', to: '/catalogo' },
          ...(categoriaActual ? [{ label: categoriaActual.nombre }] : []),
        ]}
      />

      <h2 className='section-title mb-1'>Catálogo de Productos</h2>
      <p className='text-muted mb-4'>
        {loading
          ? 'Cargando...'
          : error
          ? error
          : `${total} producto${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}`}
      </p>

      {/* Barra de búsqueda en tiempo real con debounce */}
      <div className='mb-4' style={{ maxWidth: '420px' }}>
        <SearchBar
          onSearch={handleSearch}
          initialValue={searchTerm}
          placeholder='Buscar por nombre, descripción o marca...'
        />
        {/* Indicador sutil de que está buscando */}
        {searchTerm !== debouncedSearch && (
          <p className='text-muted small mt-1 mb-0'>
            <span className='spinner-border spinner-border-sm me-1' style={{ width: '0.65rem', height: '0.65rem' }} />
            Buscando...
          </p>
        )}
      </div>

      <ProductFilters
        categorias={categorias}
        selectedCategory={selectedCategory}
        onSelectCategory={handleSelectCategory}
        sortOrder={sortBy}
        onSortChange={handleSort}
      />

      {/* Skeletons mientras carga */}
      {loading && (
        <div className='row g-4'>
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div className='col-md-4' key={i}>
              <ProductCardSkeleton />
            </div>
          ))}
        </div>
      )}

      {/* Estado vacío */}
      {!loading && !error && productos.length === 0 && (
        <EmptyState
          variant='catalog'
          title='Sin resultados'
          description='Prueba con otro término o ajusta los filtros.'
          action={{ label: 'Limpiar filtros', onClick: () => { setSearchTerm(''); setSelectedCategory(null); setSortBy('newest'); setCurrentPage(1) } }}
        />
      )}

      {/* Grilla de productos */}
      {!loading && productos.length > 0 && (
        <>
          <div className='row g-4'>
            {productos.map((product, index) => (
              <div
                className='col-md-4 catalog-card-enter'
                key={product.idPro}
                style={{ '--card-delay': `${Math.min(index, 8) * 0.05}s` }}
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>

          {/* Info de paginación + controles */}
          {totalPages > 1 && (
            <div className='d-flex flex-column align-items-center mt-4 gap-1'>
              <p className='text-muted small mb-1'>
                Página {currentPage} de {totalPages} — {total} productos
              </p>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default ProductCatalog
