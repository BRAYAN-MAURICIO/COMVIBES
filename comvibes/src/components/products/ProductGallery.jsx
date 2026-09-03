import { useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import ProductImage from './ProductImage'

// Por debajo de este ancho real, hacer zoom solo agranda píxeles: la imagen
// ya se está mostrando casi a tamaño completo. En esos casos desactivamos el
// zoom en vez de mostrar una mancha borrosa al pasar el mouse.
const ANCHO_MINIMO_ZOOM = 700

function ProductGallery({ imagenes = [], alt }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [zooming, setZooming] = useState(false)
  const [origin, setOrigin] = useState({ x: 50, y: 50 })
  const [anchoReal, setAnchoReal] = useState(0)

  const fotos = imagenes.length > 0 ? imagenes : ['']
  const total  = fotos.length
  const activa = fotos[activeIndex] || fotos[0]

  const zoomDisponible = anchoReal >= ANCHO_MINIMO_ZOOM

  const irA = useCallback((fn) => {
    setActiveIndex(fn)
    setAnchoReal(0)    // la nueva foto puede tener otra resolución
    setZooming(false)
  }, [])

  const prev = useCallback(() => irA((i) => (i - 1 + total) % total), [irA, total])
  const next = useCallback(() => irA((i) => (i + 1) % total), [irA, total])

  // Zoom con el cursor
  const handleMouseMove = (e) => {
    if (!zoomDisponible) return
    const rect = e.currentTarget.getBoundingClientRect()
    setOrigin({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    })
  }

  // Swipe táctil
  const [touchStart, setTouchStart] = useState(null)
  const handleTouchStart = (e) => setTouchStart(e.touches[0].clientX)
  const handleTouchEnd = (e) => {
    if (touchStart === null) return
    const diff = touchStart - e.changedTouches[0].clientX
    if (Math.abs(diff) > 40) diff > 0 ? next() : prev()
    setTouchStart(null)
  }

  return (
    <div>
      {/* Imagen principal con zoom, flechas y contador */}
      <div
        className={`product-gallery__zoom rounded-4 shadow position-relative ${zoomDisponible ? '' : 'product-gallery__zoom--sin-zoom'}`}
        style={{ '--zoom-x': `${origin.x}%`, '--zoom-y': `${origin.y}%` }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => zoomDisponible && setZooming(true)}
        onMouseLeave={() => setZooming(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <ProductImage
          src={activa}
          alt={`${alt} — foto ${activeIndex + 1}`}
          className={`product-gallery__zoom-img ${zooming ? 'is-zoomed' : ''}`}
          // 'contain' en vez de 'cover': la foto entra completa, sin recortarle
          // los bordes al producto. El fondo blanco lo pone el CSS.
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          loading='eager'
          onLoad={(e) => setAnchoReal(e.currentTarget.naturalWidth || 0)}
        />

        {/* Contador "1 / 3" */}
        {total > 1 && (
          <span className='gallery-counter' aria-live='polite'>
            {activeIndex + 1} / {total}
          </span>
        )}

        {/* Flechas prev / next */}
        {total > 1 && (
          <>
            <button
              type='button'
              className='gallery-arrow gallery-arrow--prev'
              onClick={prev}
              aria-label='Foto anterior'
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type='button'
              className='gallery-arrow gallery-arrow--next'
              onClick={next}
              aria-label='Foto siguiente'
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}
      </div>

      {/* Miniaturas */}
      {total > 1 && (
        <div className='product-gallery__thumbs' role='tablist' aria-label={`Fotos de ${alt}`}>
          {fotos.map((foto, index) => (
            <button
              key={foto + index}
              type='button'
              className={`product-gallery__thumb ${index === activeIndex ? 'product-gallery__thumb--active' : ''}`}
              onClick={() => { setActiveIndex(index); setAnchoReal(0); setZooming(false) }}
              role='tab'
              aria-selected={index === activeIndex}
              aria-label={`Ver foto ${index + 1} de ${alt}`}
            >
              <ProductImage
                src={foto}
                alt=''
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default ProductGallery
