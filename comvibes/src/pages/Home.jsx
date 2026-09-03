import { Link } from 'react-router-dom'
import { Truck, ShieldCheck, Heart, CreditCard, ShoppingBag, Watch, Footprints, Shirt, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import ProductCard from '../components/products/ProductCard'
import { useEffect, useState, useRef, useCallback } from 'react'
import { getCatalogo } from '../api/productos'
import { useCategories } from '../context/CategoriesContext'
import { resolveImageUrl } from '../api/uploads'
import { formatCurrency } from '../utils/formatters'

const FEATURES = [
  { icon: Truck,        title: 'Envío rápido',         text: 'A todo el occidente huilense' },
  { icon: ShieldCheck,  title: 'Calidad garantizada',  text: 'Productos seleccionados' },
  { icon: Heart,        title: 'Diseño con estilo',    text: 'Piezas exclusivas' },
  { icon: CreditCard,   title: 'Pago seguro',          text: 'Efectivo, transferencia o datáfono' },
]

// Colores de fondo del círculo — rotan junto con los productos
const SLIDE_COLORS = ['#dbeafe', '#fef3c7', '#ede9fe', '#d1fae5', '#fce7f3', '#ffedd5']

const CATEGORY_ICON = {
  'Bolsos y Carteras': ShoppingBag,
  'Accesorios':        Watch,
  'Calzado':           Footprints,
  'Ropa Casual':       Shirt,
}

// Cuántas tarjetas se ven a la vez según breakpoint
const VISIBLE = {
  sm: 1,
  md: 2,
  lg: 3,
}

function useVisibleCount() {
  const [count, setCount] = useState(3)
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth
      setCount(w < 576 ? VISIBLE.sm : w < 992 ? VISIBLE.md : VISIBLE.lg)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return count
}

function Home() {
  const { categorias } = useCategories()
  const [destacados, setDestacados]   = useState([])
  const [current, setCurrent]         = useState(0)   // índice del primer card visible
  const [paused, setPaused]           = useState(false)
  const [animDir, setAnimDir]         = useState('right') // para la clase de animación
  const timerRef                      = useRef(null)
  const visibleCount                  = useVisibleCount()

  // Estado del círculo hero rotativo
  const [heroSlide, setHeroSlide]     = useState(0)
  const [heroFade, setHeroFade]       = useState(true)

  useEffect(() => {
    // limit: 6 sirve tanto para el carrusel como para el círculo hero
    getCatalogo({ limit: 6, sortBy: 'newest' })
      .then((r) => setDestacados(r.productos || []))
      .catch(() => {})
  }, [])

  // Convertir productos reales en slides del círculo
  // Cada slide toma la primera imagen disponible del producto
  const heroSlides = destacados.map((p, i) => ({
    img:      resolveImageUrl(p.imagenes?.[0] ?? p.imagen ?? null),
    category: p.categoria || '',
    name:     p.nombre,
    price:    formatCurrency(p.precio),
    badge:    p.calificacion_promedio ? `⭐ ${Number(p.calificacion_promedio).toFixed(1)}` : '✨ Nuevo',
    color:    SLIDE_COLORS[i % SLIDE_COLORS.length],
  }))

  // Rotación automática del círculo hero cada 3 segundos
  // Solo arranca cuando ya llegaron los productos del backend
  useEffect(() => {
    if (heroSlides.length === 0) return
    const timer = setInterval(() => {
      setHeroFade(false)
      setTimeout(() => {
        setHeroSlide((prev) => (prev + 1) % heroSlides.length)
        setHeroFade(true)
      }, 300)
    }, 3000)
    return () => clearInterval(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroSlides.length])

  const total    = destacados.length
  const maxIndex = Math.max(0, total - visibleCount)

  const goNext = useCallback(() => {
    setAnimDir('right')
    setCurrent((prev) => (prev >= maxIndex ? 0 : prev + 1))
  }, [maxIndex])

  const goPrev = useCallback(() => {
    setAnimDir('left')
    setCurrent((prev) => (prev <= 0 ? maxIndex : prev - 1))
  }, [maxIndex])

  // Auto-avance cada 3.5 s
  useEffect(() => {
    if (paused || total === 0) return
    timerRef.current = setInterval(goNext, 3500)
    return () => clearInterval(timerRef.current)
  }, [paused, goNext, total])

  const visibleProducts = destacados.slice(current, current + visibleCount)

  return (
    <>
      <section className='hero-section'>
        <div className='hero-dots' aria-hidden='true' />
        <div className='container'>
          <div className='row align-items-center'>
            <div className='col-lg-7 text-center text-lg-start'>
              <span className='badge bg-primary-subtle text-primary mb-3'>
                Tienda online del occidente huilense
              </span>

              <h1 className='display-4 fw-bold text-primary mb-3'>
                Bienvenido a COMVIBES
              </h1>

              <p className='lead text-muted mb-4' style={{ maxWidth: '520px' }}>
                Bolsos, accesorios y productos exclusivos, seleccionados con estilo
                y entregados directo a tu puerta.
              </p>

              <div className='d-flex justify-content-center justify-content-lg-start gap-3 flex-wrap'>
                <Link to='/catalogo' className='btn btn-primary btn-lg'>
                  Ver catálogo
                </Link>
                <Link to='/categorias' className='btn btn-outline-primary btn-lg'>
                  Explorar categorías
                </Link>
              </div>
            </div>

            <div className='col-lg-5 d-none d-lg-flex justify-content-center mt-5 mt-lg-0'>
              <div className='hero-circle-wrap'>
                {/* Círculo principal con imagen rotatoria */}
                <div className='hero-circle' style={{ '--slide-color': heroSlides[heroSlide]?.color ?? '#dbeafe' }}>
                  <img
                    src={heroSlides[heroSlide]?.img ?? '/src/assets/img/productos/placeholder.svg'}
                    alt={heroSlides[heroSlide]?.name ?? 'Producto'}
                    className={`hero-circle__img${heroFade ? ' hero-circle__img--visible' : ''}`}
                  />
                </div>

                {/* Tarjeta de producto flotante */}
                <div className={`hero-product-card${heroFade ? ' hero-product-card--visible' : ''}`}>
                  <span className='hero-product-card__cat'>{heroSlides[heroSlide]?.category}</span>
                  <span className='hero-product-card__name'>{heroSlides[heroSlide]?.name}</span>
                  <span className='hero-product-card__price'>{heroSlides[heroSlide]?.price}</span>
                  <span className='hero-product-card__badge'>{heroSlides[heroSlide]?.badge}</span>
                </div>

                {/* Pill de envío */}
                <div className='hero-circle-pill'>
                  <span>🚚</span> Envío gratis +$200k
                </div>

                {/* Dots indicadores */}
                <div className='hero-circle-dots' aria-hidden='true'>
                  {heroSlides.map((_, i) => (
                    <button
                      key={i}
                      className={`hero-circle-dot${i === heroSlide ? ' hero-circle-dot--active' : ''}`}
                      onClick={() => { setHeroFade(false); setTimeout(() => { setHeroSlide(i); setHeroFade(true) }, 300) }}
                    />
                  ))}
                </div>

                {/* Anillo decorativo */}
                <div className='hero-circle-ring' aria-hidden='true' />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section className='container py-5'>
        <div className='row g-4'>
          {FEATURES.map((feature, i) => {
            const Icon = feature.icon
            return (
              <div
                className='col-6 col-md-3 feature-animate'
                key={feature.title}
                style={{ '--i': i }}
              >
                <div className='feature-item text-center'>
                  <div className='feature-item__icon'>
                    <Icon size={22} />
                  </div>
                  <h6 className='fw-bold mb-1 mt-3'>{feature.title}</h6>
                  <p className='text-muted small mb-0'>{feature.text}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Carrusel de productos destacados ─────────────────── */}
      <section
        className='section-tinted py-5'
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className='container'>
          <div className='d-flex justify-content-between align-items-center mb-4'>
            <h2 className='section-title mb-0'>Productos destacados</h2>

            <div className='d-flex align-items-center gap-3'>
              {/* Dots indicadores */}
              {total > visibleCount && (
                <div className='carousel-dots' aria-hidden='true'>
                  {Array.from({ length: maxIndex + 1 }).map((_, i) => (
                    <button
                      key={i}
                      className={`carousel-dot${i === current ? ' carousel-dot--active' : ''}`}
                      onClick={() => { setAnimDir(i > current ? 'right' : 'left'); setCurrent(i) }}
                      aria-label={`Ir a página ${i + 1}`}
                    />
                  ))}
                </div>
              )}

              <Link to='/catalogo' className='d-flex align-items-center gap-1 fw-semibold text-decoration-none'>
                Ver todos <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          <div className='carousel-track-wrapper'>
            {/* Flecha izquierda */}
            {total > visibleCount && (
              <button
                className='carousel-arrow carousel-arrow--prev'
                onClick={goPrev}
                aria-label='Anterior'
              >
                <ChevronLeft size={20} />
              </button>
            )}

            {/* Tarjetas — usamos key para forzar re-mount y disparar la animación CSS */}
            <div
              className={`carousel-track carousel-track--${animDir}`}
              key={`${current}-${animDir}`}
            >
              {visibleProducts.map((product) => (
                <div
                  className='carousel-item-slot'
                  key={product.idPro}
                  style={{ flex: `0 0 calc(100% / ${visibleCount})` }}
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>

            {/* Flecha derecha */}
            {total > visibleCount && (
              <button
                className='carousel-arrow carousel-arrow--next'
                onClick={goNext}
                aria-label='Siguiente'
              >
                <ChevronRight size={20} />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── Categorías ───────────────────────────────────────── */}
      <section className='container pb-5'>
        <h2 className='section-title text-center'>Compra por categoría</h2>

        <div className='row g-4'>
          {categorias.map((cat, i) => {
            const Icon = CATEGORY_ICON[cat.nombre] || ShoppingBag
            return (
              <div
                className='col-md-6 cat-animate'
                key={cat.idCat}
                style={{ '--i': i }}
              >
                <Link
                  to={`/catalogo?categoria=${cat.idCat}`}
                  className='text-decoration-none text-reset'
                >
                  <div className='card hover-lift border-0 rounded-4 p-5 h-100'>
                    <div className='d-flex align-items-center gap-3'>
                      <div className='icon-badge'>
                        <Icon size={22} />
                      </div>
                      <div>
                        <h3 className='fw-bold text-primary mb-1'>{cat.nombre}</h3>
                        <p className='text-muted mb-0'>{cat.descripcion}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            )
          })}
        </div>
      </section>
    </>
  )
}

export default Home
