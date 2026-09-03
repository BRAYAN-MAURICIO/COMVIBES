import { Link } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'

// items: [{ label: 'Catálogo', to: '/catalogo' }, { label: 'Reloj Unisex Vintage' }]
// El último elemento no debe traer 'to' — es la página actual, no un link.
function Breadcrumbs({ items }) {
  return (
    <nav aria-label='breadcrumb' className='breadcrumbs mb-4'>
      <ol className='breadcrumbs__list'>
        <li>
          <Link to='/' className='breadcrumbs__link' aria-label='Inicio'>
            <Home size={14} />
          </Link>
        </li>

        {items.map((item, index) => (
          <li key={item.label} className='d-flex align-items-center'>
            <ChevronRight size={14} className='breadcrumbs__chevron' aria-hidden='true' />
            {item.to && index !== items.length - 1 ? (
              <Link to={item.to} className='breadcrumbs__link'>
                {item.label}
              </Link>
            ) : (
              <span className='breadcrumbs__current' aria-current='page'>
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export default Breadcrumbs
