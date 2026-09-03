import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ShoppingBag, Watch, Footprints, Shirt, ArrowRight } from 'lucide-react'
import Breadcrumbs from '../components/ui/Breadcrumbs'
import { useCategories } from '../context/CategoriesContext'
import { getCatalogo } from '../api/productos'

const CATEGORY_ICON = {
  'Bolsos y Carteras': ShoppingBag,
  'Accesorios': Watch,
  'Calzado': Footprints,
  'Ropa Casual': Shirt,
}

function Categories() {
  const { categorias } = useCategories()
  const [conteos, setConteos] = useState({})

  useEffect(() => {
    // Pedir todos los activos para contar por categoría
    getCatalogo({ limit: 200 })
      .then((r) => {
        const mapa = {}
        ;(r.productos || []).forEach((p) => {
          mapa[p.idCat] = (mapa[p.idCat] || 0) + 1
        })
        setConteos(mapa)
      })
      .catch(() => {})
  }, [])

  const countByCategory = (idCat) => conteos[idCat] || 0

  return (
    <div className='container py-5'>
      <Breadcrumbs items={[{ label: 'Categorías' }]} />

      <h1 className='fw-bold text-primary mb-1'>Categorías</h1>
      <p className='text-muted mb-5'>Explora nuestro catálogo por tipo de producto</p>

      <div className='row g-4'>
        {categorias.map((category) => {
          const Icon = CATEGORY_ICON[category.nombre] || ShoppingBag
          const total = countByCategory(category.idCat)

          return (
            <div className='col-md-6 col-lg-3' key={category.idCat}>
              <Link
                to={`/catalogo?categoria=${category.idCat}`}
                className='text-decoration-none text-reset'
              >
                <div className='card hover-lift border-0 shadow-sm rounded-4 p-4 h-100 d-flex flex-column'>
                  <div className='icon-badge icon-badge--blue mb-3'>
                    <Icon size={24} />
                  </div>

                  <h5 className='fw-bold mb-1'>{category.nombre}</h5>
                  <p className='text-muted small mb-3 flex-grow-1'>{category.descripcion}</p>

                  <div className='d-flex justify-content-between align-items-center'>
                    <span className='badge bg-primary-subtle text-primary'>
                      {total} producto{total !== 1 ? 's' : ''}
                    </span>
                    <ArrowRight size={16} className='text-primary' />
                  </div>
                </div>
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Categories
