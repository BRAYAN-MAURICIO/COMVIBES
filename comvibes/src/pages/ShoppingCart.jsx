import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart as CartIcon, Minus, Plus, Trash2, Lock, Tag, Truck } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { formatCurrency } from '../utils/formatters'
import ProductImage from '../components/products/ProductImage'
import Breadcrumbs from '../components/ui/Breadcrumbs'

/* Monto a partir del cual el envío es gratis */
const FREE_SHIPPING_THRESHOLD = 200000

function CartSummary({ items, total, onCheckout }) {
  const totalItems = items.reduce((acc, i) => acc + i.cantidad, 0)
  const freeShipping = total >= FREE_SHIPPING_THRESHOLD
  const remaining = FREE_SHIPPING_THRESHOLD - total

  return (
    <div className='cart-summary'>
      <h5 className='cart-summary__title'>Resumen del pedido</h5>

      {/* Progreso envío gratis */}
      {!freeShipping && (
        <div className='cart-summary__shipping-progress'>
          <div className='d-flex justify-content-between align-items-center mb-1'>
            <span className='cart-summary__shipping-label'>
              <Truck size={13} className='me-1' />
              Te faltan <strong>{formatCurrency(remaining)}</strong> para envío gratis
            </span>
          </div>
          <div className='cart-summary__progress-bar'>
            <div
              className='cart-summary__progress-fill'
              style={{ width: `${Math.min((total / FREE_SHIPPING_THRESHOLD) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {freeShipping && (
        <div className='cart-summary__free-shipping'>
          <Truck size={14} />
          <span>¡Tienes envío gratis!</span>
        </div>
      )}

      {/* Línea de subtotal */}
      <div className='cart-summary__row'>
        <span className='cart-summary__row-label'>
          Subtotal <span className='cart-summary__count'>({totalItems} {totalItems === 1 ? 'producto' : 'productos'})</span>
        </span>
        <span>{formatCurrency(total)}</span>
      </div>

      <div className='cart-summary__row'>
        <span className='cart-summary__row-label'>Envío</span>
        <span className={freeShipping ? 'cart-summary__free-tag' : 'text-muted small'}>
          {freeShipping ? 'Gratis' : 'Se calcula al confirmar'}
        </span>
      </div>

      <div className='cart-summary__divider' />

      {/* Total */}
      <div className='cart-summary__total'>
        <span>Total</span>
        <span className='cart-summary__total-amount'>{formatCurrency(total)}</span>
      </div>

      {/* CTA */}
      <button className='btn btn-primary w-100 cart-summary__cta' onClick={onCheckout}>
        <Lock size={15} />
        Pagar de forma segura
      </button>

      <Link to='/catalogo' className='btn btn-link w-100 mt-1 small'>
        Seguir comprando
      </Link>
    </div>
  )
}

function ShoppingCart() {
  const { items, removeFromCart, updateQuantity, total, getStock, getImagen } = useCart()
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  if (items.length === 0) {
    return (
      <div className='container py-5 text-center'>
        <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-4" aria-hidden="true">
          <rect x="10" y="20" width="100" height="65" rx="10" fill="#f1f5f9"/>
          <path d="M30 20 Q30 10 42 10 L78 10 Q90 10 90 20" stroke="#cbd5e1" strokeWidth="3" fill="none" strokeLinecap="round"/>
          <circle cx="45" cy="75" r="7" fill="#e2e8f0"/>
          <circle cx="75" cy="75" r="7" fill="#e2e8f0"/>
          <path d="M38 45 L82 45" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round"/>
          <path d="M38 55 L68 55" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round"/>
          <circle cx="95" cy="15" r="10" fill="#3b82f6"/>
          <path d="M90 15 L94 19 L100 11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <h2 className='section-title'>Tu carrito está vacío</h2>
        <p className='text-muted'>Explora el catálogo y encuentra algo que te guste.</p>
        <Link to='/catalogo' className='btn btn-primary mt-2'>
          Ir al catálogo
        </Link>
      </div>
    )
  }

  const handleIncrease = (item) => {
    const stock = getStock(item.idPro)
    if (item.cantidad >= stock) {
      toast.warning('Ya tienes el máximo disponible', `Solo hay ${stock} unidad(es) de ${item.nombre} en stock`)
      return
    }
    updateQuantity(item.idPro, item.cantidad + 1)
  }

  const handleCheckout = () => {
    if (!isAuthenticated) {
      toast.info('Inicia sesión para continuar', 'Necesitas una cuenta para completar la compra')
      navigate('/login', { state: { from: '/checkout' } })
      return
    }
    navigate('/checkout')
  }

  return (
    <div className='container py-5'>
      <Breadcrumbs items={[{ label: 'Carrito de Compras' }]} />
      <h2 className='section-title'>Carrito de Compras</h2>

      <div className='row g-4 align-items-start'>
        {/* ── Lista de productos ── */}
        <div className='col-lg-8'>
          {items.map((item) => {
            const stock = getStock(item.idPro)
            const atMax = item.cantidad >= stock

            return (
              <div key={item.idPro} className='card border-0 shadow-sm rounded-4 mb-3'>
                <div className='card-body'>
                  <div className='row align-items-center g-3'>
                    <div className='col-4 col-md-2'>
                      <ProductImage
                        src={getImagen(item.idPro, item.imagen)}
                        alt={item.nombre}
                        className='rounded-3'
                        style={{ aspectRatio: '1/1', objectFit: 'cover', width: '100%' }}
                      />
                    </div>

                    <div className='col-8 col-md-4'>
                      <h6 className='fw-bold mb-1'>{item.nombre}</h6>
                      <p className='text-muted small mb-0'>{formatCurrency(item.precio)} c/u</p>
                      {atMax && (
                        <small className='text-warning fw-semibold'>Máximo disponible en stock</small>
                      )}
                    </div>

                    <div className='col-6 col-md-3'>
                      <div className='qty-stepper'>
                        <button
                          type='button'
                          className='qty-stepper__btn'
                          onClick={() => updateQuantity(item.idPro, item.cantidad - 1)}
                          disabled={item.cantidad <= 1}
                          aria-label={`Disminuir cantidad de ${item.nombre}`}
                        >
                          <Minus size={14} />
                        </button>
                        <span className='qty-stepper__value'>{item.cantidad}</span>
                        <button
                          type='button'
                          className='qty-stepper__btn'
                          onClick={() => handleIncrease(item)}
                          disabled={atMax}
                          aria-label={`Aumentar cantidad de ${item.nombre}`}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>

                    <div className='col-4 col-md-2 text-md-end'>
                      <span className='fw-bold text-primary'>
                        {formatCurrency(item.precio * item.cantidad)}
                      </span>
                    </div>

                    <div className='col-2 col-md-1 text-end'>
                      <button
                        className='btn btn-link text-danger p-0'
                        onClick={() => removeFromCart(item.idPro)}
                        aria-label={`Eliminar ${item.nombre} del carrito`}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Resumen sticky ── */}
        <div className='col-lg-4'>
          <div className='cart-summary-wrapper'>
            <CartSummary items={items} total={total} onCheckout={handleCheckout} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ShoppingCart
