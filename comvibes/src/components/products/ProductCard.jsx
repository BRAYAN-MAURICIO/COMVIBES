import { Link } from 'react-router-dom'
import { Heart, ShoppingCart as CartIcon, Eye } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { useWishlist } from '../../context/WishlistContext'
import { useToast } from '../../context/ToastContext'
import { formatCurrency } from '../../utils/formatters'
import ProductImage from './ProductImage'
import StarRating from '../ui/StarRating'

function ProductCard({ product }) {
  const { addToCart } = useCart()
  const { isInWishlist, toggleWishlist } = useWishlist()
  const toast = useToast()
  const outOfStock = product.stock <= 0
  const favorito = isInWishlist(product.idPro)
  const avgRating = product.calificacion_promedio > 0 ? product.calificacion_promedio : null
  const reviewCount = product.total_opiniones || 0

  const handleAdd = (e) => {
    e.preventDefault()
    const result = addToCart(product, 1)
    if (!result.added) {
      toast.warning('Ya tienes el máximo disponible', `Solo hay ${result.cantidadFinal} unidad(es) en stock`)
      return
    }
    toast.success('Agregado al carrito', product.nombre)
  }

  const handleToggleWishlist = (e) => {
    e.preventDefault()
    toggleWishlist(product).catch((err) => toast.error('No se pudo actualizar favoritos', err.message))
  }

  return (
    <div className='product-card'>
      {/* ── Imagen con aspect-ratio fijo y overlay de acciones ── */}
      <div className='product-card__img-wrap'>
        <Link to={`/producto/${product.idPro}`} tabIndex={-1} aria-hidden='true'>
          <ProductImage
            src={product.imagen}
            alt={product.nombre}
            className='product-card__img'
          />
        </Link>

        {/* Badge agotado sobre la imagen */}
        {outOfStock && (
          <span className='product-card__badge product-card__badge--out'>Agotado</span>
        )}

        {/* Overlay que aparece al hover */}
        <div className='product-card__overlay'>
          <button
            className='product-card__overlay-btn product-card__overlay-btn--cart'
            onClick={handleAdd}
            disabled={outOfStock}
            aria-label={`Agregar ${product.nombre} al carrito`}
          >
            <CartIcon size={16} />
            {outOfStock ? 'Sin stock' : 'Agregar al carrito'}
          </button>

          <Link
            to={`/producto/${product.idPro}`}
            className='product-card__overlay-btn product-card__overlay-btn--view'
            aria-label={`Ver detalle de ${product.nombre}`}
          >
            <Eye size={16} /> Ver producto
          </Link>
        </div>

        {/* Botón wishlist — siempre visible */}
        <button
          type='button'
          className='product-card__wish'
          onClick={handleToggleWishlist}
          aria-label={favorito ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          aria-pressed={favorito}
        >
          <Heart size={17} fill={favorito ? '#EF4444' : 'none'} color={favorito ? '#EF4444' : '#6b7280'} />
        </button>
      </div>

      {/* ── Info del producto ── */}
      <div className='product-card__body'>
        <Link to={`/producto/${product.idPro}`} className='text-decoration-none text-reset'>
          <p className='product-card__category'>{product.categoria}</p>
          <h5 className='product-card__name'>{product.nombre}</h5>
        </Link>

        {avgRating && (
          <div className='d-flex align-items-center gap-1 mb-1'>
            <StarRating value={avgRating} size={12} />
            <small className='text-muted'>({reviewCount})</small>
          </div>
        )}

        <div className='d-flex align-items-center justify-content-between mt-auto pt-2'>
          <span className='product-card__price'>{formatCurrency(product.precio)}</span>
          {!outOfStock && (
            <span className='product-card__stock'>{product.stock} uds.</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProductCard
