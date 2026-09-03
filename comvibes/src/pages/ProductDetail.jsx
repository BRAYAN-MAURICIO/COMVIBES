import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Heart, Minus, Plus, ShoppingCart as CartIcon, MessageSquare } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useWishlist } from '../context/WishlistContext'
import { useAuth } from '../context/AuthContext'
import { useReviews } from '../context/ReviewsContext'
import { useToast } from '../context/ToastContext'
import { useCategories } from '../context/CategoriesContext'
import { formatCurrency, formatDate } from '../utils/formatters'
import { getProducto, getCatalogo } from '../api/productos'
import ProductGallery from '../components/products/ProductGallery'
import ProductCard from '../components/products/ProductCard'
import ProductCardSkeleton from '../components/ui/ProductCardSkeleton'
import Breadcrumbs from '../components/ui/Breadcrumbs'
import StarRating from '../components/ui/StarRating'

// Skeleton simple para el detalle mientras carga el producto
function ProductDetailSkeleton() {
  return (
    <div className='container py-5'>
      <div className='row'>
        <div className='col-md-6'>
          <div className='skeleton rounded-4' style={{ height: 380 }} />
        </div>
        <div className='col-md-6 ps-md-5'>
          <div className='skeleton rounded-2 mb-3' style={{ height: 20, width: '30%' }} />
          <div className='skeleton rounded-2 mb-3' style={{ height: 36, width: '80%' }} />
          <div className='skeleton rounded-2 mb-4' style={{ height: 36, width: '40%' }} />
          <div className='skeleton rounded-2 mb-2' style={{ height: 16, width: '90%' }} />
          <div className='skeleton rounded-2 mb-4' style={{ height: 16, width: '70%' }} />
          <div className='skeleton rounded-2 mb-4' style={{ height: 48, width: '60%' }} />
          <div className='d-flex gap-2'>
            <div className='skeleton rounded-2' style={{ height: 48, width: 180 }} />
            <div className='skeleton rounded-2' style={{ height: 48, width: 180 }} />
          </div>
        </div>
      </div>
    </div>
  )
}

function ProductDetail() {
  const { id } = useParams()
  const { addToCart } = useCart()
  const { isInWishlist, toggleWishlist } = useWishlist()
  const { user } = useAuth()
  const { getReviewsByProduct, getAverageRating, hasReviewed, hasPurchased, createReview, loadReviews } = useReviews()
  const { categorias } = useCategories()
  const toast = useToast()
  const navigate = useNavigate()

  // El producto se carga directamente desde el backend (GET /api/productos/:id),
  // no desde ProductsContext, porque ese contexto usa includeInactive=true y
  // limit=200 — pensado para el admin. Un cliente no debería depender de él.
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [cantidad, setCantidad] = useState(1)
  const [nuevaCalificacion, setNuevaCalificacion] = useState(0)
  const [nuevoComentario, setNuevoComentario] = useState('')
  const [errorResena, setErrorResena] = useState('')
  const [submittingResena, setSubmittingResena] = useState(false)
  const [relacionados, setRelacionados] = useState([])

  const loadProduct = useCallback(async () => {
    setLoading(true)
    setNotFound(false)
    try {
      const prod = await getProducto(id)
      if (!prod || !prod.activo) {
        setNotFound(true)
        return
      }
      setProduct(prod)
      setCantidad(1)
    } catch {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadProduct()
  }, [loadProduct])

  // Cargar relacionados y reseñas una vez que tenemos el producto
  useEffect(() => {
    if (!product) { setRelacionados([]); return }

    getCatalogo({ categoria: product.idCat, limit: 5 })
      .then((res) => {
        const lista = (res.productos || []).filter((p) => p.idPro !== product.idPro).slice(0, 4)
        setRelacionados(lista)
      })
      .catch(() => setRelacionados([]))

    loadReviews(product.idPro)
  }, [product, loadReviews])

  if (loading) return <ProductDetailSkeleton />

  if (notFound) {
    return (
      <div className='container py-5 text-center'>
        <h2 className='fw-bold text-primary'>Producto no encontrado</h2>
        <p className='text-muted'>El producto que buscas no existe o fue removido.</p>
        <Link to='/catalogo' className='btn btn-primary mt-3'>
          Volver al catálogo
        </Link>
      </div>
    )
  }

  const resenas = getReviewsByProduct(product.idPro)
  const promedio = getAverageRating(product.idPro)
  const yaOpino = user ? hasReviewed(product.idPro, user.idUsu) : false
  const comproProd = user ? hasPurchased(product.idPro) : false
  const outOfStock = product.stock <= 0
  const categoria = categorias.find((c) => c.idCat === product.idCat)

  const handleAdd = () => {
    const result = addToCart(product, cantidad)

    if (!result.added) {
      toast.warning(
        'Ya tienes el máximo disponible',
        `Solo hay ${result.cantidadFinal} unidad(es) de ${product.nombre} en stock`
      )
      return
    }

    if (result.capped) {
      toast.info(
        'Cantidad ajustada al stock disponible',
        `Se agregaron ${result.cantidadFinal} unidad(es) en total (el máximo disponible)`
      )
      setCantidad(1)
      return
    }

    toast.success('Agregado al carrito', `${cantidad} × ${product.nombre}`)
    setCantidad(1)
  }

  const handleSubmitResena = async (e) => {
    e.preventDefault()

    if (nuevaCalificacion === 0) {
      setErrorResena('Selecciona una calificación de 1 a 5 estrellas')
      return
    }
    setErrorResena('')
    setSubmittingResena(true)
    try {
      await createReview({
        idPro: product.idPro,
        comentario: nuevoComentario.trim(),
        calificacion: nuevaCalificacion,
      })
      setNuevaCalificacion(0)
      setNuevoComentario('')
      toast.success('¡Gracias por tu opinión!')
    } catch (err) {
      toast.error('No se pudo guardar tu opinión', err.message)
    } finally {
      setSubmittingResena(false)
    }
  }

  return (
    <div className='container py-5'>
      <Breadcrumbs
        items={[
          { label: 'Catálogo', to: '/catalogo' },
          ...(categoria ? [{ label: categoria.nombre, to: `/catalogo?categoria=${categoria.idCat}` }] : []),
          { label: product.nombre },
        ]}
      />

      <div className='row'>
        <div className='col-md-6'>
          {/* Usa imagenes[] de la galería; si está vacío, cae al campo imagen principal */}
          <ProductGallery
            imagenes={product.imagenes?.length > 0 ? product.imagenes : (product.imagen ? [product.imagen] : [])}
            alt={product.nombre}
          />
        </div>

        <div className='col-md-6'>
          <span className='badge bg-primary-subtle text-primary mb-2'>{product.categoria}</span>
          <h1 className='fw-bold'>{product.nombre}</h1>

          {promedio && (
            <div className='d-flex align-items-center gap-2 mb-2'>
              <StarRating value={promedio} size={16} />
              <span className='small text-muted'>
                {promedio.toFixed(1)} ({resenas.length} opinión{resenas.length !== 1 ? 'es' : ''})
              </span>
            </div>
          )}

          <h2 className='text-primary fw-bold my-4'>{formatCurrency(product.precio)}</h2>

          <p className='text-muted'>{product.descripcion}</p>

          {(product.marca || product.color || product.talla) && (
            <div className='d-flex flex-wrap gap-3 mb-3 product-specs'>
              {product.marca && (
                <span><strong>Marca:</strong> {product.marca}</span>
              )}
              {product.color && (
                <span><strong>Color:</strong> {product.color}</span>
              )}
              {product.talla && (
                <span><strong>Talla:</strong> {product.talla}</span>
              )}
            </div>
          )}

          {outOfStock ? (
            <span className='badge bg-danger mb-3'>Sin stock disponible</span>
          ) : (
            <span className='badge bg-success-subtle text-success mb-3'>
              {product.stock} unidades disponibles
            </span>
          )}

          {!outOfStock && (
            <div className='d-flex align-items-center gap-3 mb-3'>
              <span className='fw-semibold'>Cantidad</span>
              <div className='qty-stepper'>
                <button
                  type='button'
                  className='qty-stepper__btn'
                  onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                  disabled={cantidad <= 1}
                  aria-label='Disminuir cantidad'
                >
                  <Minus size={14} />
                </button>
                <span className='qty-stepper__value'>{cantidad}</span>
                <button
                  type='button'
                  className='qty-stepper__btn'
                  onClick={() => setCantidad((c) => Math.min(product.stock, c + 1))}
                  disabled={cantidad >= product.stock}
                  aria-label='Aumentar cantidad'
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          )}

          <div className='d-flex gap-2 mt-2'>
            <button
              className='btn btn-primary btn-lg d-flex align-items-center gap-2'
              onClick={handleAdd}
              disabled={outOfStock}
            >
              <CartIcon size={18} />
              {outOfStock ? 'Sin stock' : 'Agregar al carrito'}
            </button>

            <button
              type='button'
              className='btn btn-outline-secondary btn-lg d-flex align-items-center gap-2'
              onClick={() => toggleWishlist(product)}
              aria-pressed={isInWishlist(product.idPro)}
            >
              <Heart
                size={18}
                fill={isInWishlist(product.idPro) ? '#EF4444' : 'none'}
                color={isInWishlist(product.idPro) ? '#EF4444' : 'currentColor'}
              />
              {isInWishlist(product.idPro) ? 'En favoritos' : 'Agregar a favoritos'}
            </button>
          </div>
        </div>
      </div>

      {/* --- Opiniones --- */}
      <div className='mt-5 pt-4 border-top'>
        <div className='d-flex align-items-center gap-2 mb-4'>
          <div className='icon-badge icon-badge--orange'>
            <MessageSquare size={20} />
          </div>
          <div>
            <h4 className='fw-bold mb-0'>Opiniones de clientes</h4>
            {promedio && (
              <small className='text-muted'>
                {promedio.toFixed(1)} de 5 · {resenas.length} opinión{resenas.length !== 1 ? 'es' : ''}
              </small>
            )}
          </div>
        </div>

        <div className='row g-4'>
          <div className='col-lg-7'>
            {resenas.length === 0 ? (
              <p className='text-muted'>Este producto todavía no tiene opiniones. ¡Sé el primero!</p>
            ) : (
              <div className='d-flex flex-column gap-3'>
                {resenas.map((resena) => (
                  <div key={resena.idOpi} className='card border-0 shadow-sm rounded-4 p-3'>
                    <div className='d-flex justify-content-between align-items-start mb-1'>
                      <span className='fw-semibold'>{resena.cliente}</span>
                      <small className='text-muted'>{formatDate(resena.fecha)}</small>
                    </div>
                    <StarRating value={resena.calificacion} size={14} />
                    {resena.comentario && (
                      <p className='small text-muted mt-2 mb-0'>{resena.comentario}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className='col-lg-5'>
            <div className='card border-0 shadow-sm rounded-4 p-4'>
              {!user ? (
                <>
                  <h6 className='fw-bold mb-2'>¿Ya compraste este producto?</h6>
                  <p className='text-muted small mb-3'>Inicia sesión para dejar tu opinión.</p>
                  <button className='btn btn-primary btn-sm' onClick={() => navigate('/login')}>
                    Iniciar sesión
                  </button>
                </>
              ) : yaOpino ? (
                <p className='text-muted small mb-0'>Ya dejaste tu opinión sobre este producto. ¡Gracias!</p>
              ) : !comproProd ? (
                <>
                  <h6 className='fw-bold mb-2'>Opiniones verificadas</h6>
                  <p className='text-muted small mb-0'>
                    Solo los clientes que han comprado este producto pueden dejar una reseña.
                  </p>
                </>
              ) : (
                <form onSubmit={handleSubmitResena}>
                  <h6 className='fw-bold mb-3'>Deja tu opinión</h6>

                  <div className='mb-3'>
                    <StarRating
                      value={nuevaCalificacion}
                      onChange={(val) => { setNuevaCalificacion(val); setErrorResena('') }}
                      readOnly={false}
                      size={22}
                    />
                    {errorResena && <div className='text-danger small mt-1'>{errorResena}</div>}
                  </div>

                  <textarea
                    className='form-control mb-3'
                    rows='3'
                    placeholder='Cuéntanos qué te pareció (opcional)'
                    value={nuevoComentario}
                    onChange={(e) => setNuevoComentario(e.target.value)}
                  />

                  <button type='submit' className='btn btn-primary btn-sm w-100' disabled={submittingResena}>
                    {submittingResena ? 'Publicando...' : 'Publicar opinión'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {relacionados.length > 0 && (
        <div className='mt-5 pt-4 border-top'>
          <h4 className='fw-bold mb-4'>Productos relacionados</h4>
          <div className='row g-4'>
            {relacionados.map((p) => (
              <div className='col-md-4' key={p.idPro}>
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductDetail
