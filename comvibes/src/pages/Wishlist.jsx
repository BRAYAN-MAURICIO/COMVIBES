import { Link } from 'react-router-dom'
import EmptyState from '../components/ui/EmptyState'
import { useToast } from '../context/ToastContext'
import { Heart, ShoppingCart as CartIcon, X } from 'lucide-react'
import Breadcrumbs from '../components/ui/Breadcrumbs'
import { useWishlist } from '../context/WishlistContext'
import { useCart } from '../context/CartContext'
import { formatCurrency } from '../utils/formatters'
import ProductImage from '../components/products/ProductImage'

function Wishlist() {
  const toast = useToast()
  const { items, removeFromWishlist } = useWishlist()
  const { addToCart, getImagen } = useCart()

  const handleAddToCart = (item) => {
    addToCart(item, 1)
    toast.success('Agregado al carrito', item.nombre)
  }

  const handleRemove = async (idPro) => {
    try {
      await removeFromWishlist(idPro)
    } catch (err) {
      toast.error('No se pudo quitar de favoritos', err.message)
    }
  }

  if (items.length === 0) {
    return (
      <div className='container py-5'>
        <Breadcrumbs items={[{ label: 'Favoritos' }]} />
        <EmptyState
          variant='wishlist'
          title='Tu lista de favoritos está vacía'
          description='Agrega productos que te gusten y encuéntralos aquí fácilmente.'
          action={{ label: 'Explorar catálogo', to: '/catalogo' }}
        />
      </div>
    )
  }

  return (
    <div className='container py-5'>
      <Breadcrumbs items={[{ label: 'Favoritos' }]} />

      <h1 className='fw-bold text-primary mb-5'>Lista de Favoritos</h1>

      <div className='row g-4'>
        {items.map((item) => (
          <div className='col-md-4' key={item.idPro}>
            <div className='card hover-lift shadow-sm border-0 rounded-4 h-100'>
              <Link to={`/producto/${item.idPro}`}>
                <ProductImage
                  src={getImagen(item.idPro, item.imagen)}
                  alt={item.nombre}
                  className='card-img-top'
                  style={{ height: '200px', objectFit: 'cover' }}
                />
              </Link>

              <div className='card-body d-flex flex-column'>
                <h5 className='fw-bold'>{item.nombre}</h5>
                <h6 className='text-primary fw-bold'>{formatCurrency(item.precio)}</h6>

                <div className='d-flex gap-2 mt-auto'>
                  <button
                    className='btn btn-primary btn-sm flex-grow-1 d-flex align-items-center justify-content-center gap-2'
                    onClick={() => handleAddToCart(item)}
                  >
                    <CartIcon size={14} /> Agregar
                  </button>
                  <button
                    className='btn btn-outline-danger btn-sm d-flex align-items-center justify-content-center'
                    onClick={() => handleRemove(item.idPro)}
                    aria-label={`Quitar ${item.nombre} de favoritos`}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Wishlist
