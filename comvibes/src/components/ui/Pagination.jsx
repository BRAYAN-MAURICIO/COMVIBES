import { ChevronLeft, ChevronRight } from 'lucide-react'

// Genera el array de páginas a mostrar con elipsis cuando hay muchas.
// Ejemplo con 10 páginas en página 5: [1, '…', 4, 5, 6, '…', 10]
function buildPageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages = []
  pages.push(1)

  if (current > 3) pages.push('…')

  const start = Math.max(2, current - 1)
  const end   = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)

  if (current < total - 2) pages.push('…')
  pages.push(total)

  return pages
}

function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null

  const pages = buildPageRange(currentPage, totalPages)

  return (
    <nav aria-label='Paginación'>
      <ul className='pagination mb-0'>
        {/* Botón Anterior */}
        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
          <button
            className='page-link d-flex align-items-center gap-1'
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label='Página anterior'
          >
            <ChevronLeft size={15} />
            <span className='d-none d-sm-inline'>Anterior</span>
          </button>
        </li>

        {/* Números de página / elipsis */}
        {pages.map((page, idx) =>
          page === '…' ? (
            <li key={`ellipsis-${idx}`} className='page-item disabled'>
              <span className='page-link'>…</span>
            </li>
          ) : (
            <li key={page} className={`page-item ${page === currentPage ? 'active' : ''}`}>
              <button
                className='page-link'
                onClick={() => onPageChange(page)}
                aria-current={page === currentPage ? 'page' : undefined}
                aria-label={`Ir a página ${page}`}
              >
                {page}
              </button>
            </li>
          )
        )}

        {/* Botón Siguiente */}
        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
          <button
            className='page-link d-flex align-items-center gap-1'
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label='Página siguiente'
          >
            <span className='d-none d-sm-inline'>Siguiente</span>
            <ChevronRight size={15} />
          </button>
        </li>
      </ul>
    </nav>
  )
}

export default Pagination
