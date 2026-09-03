import { useState } from 'react'
import { resolveImageUrl } from '../../api/uploads'

// Importamos el SVG placeholder directamente para que Vite lo empaquete
// y siempre esté disponible, incluso en producción.
import placeholderSvg from '../../assets/img/productos/placeholder.svg'

/**
 * <img> con manejo de error y resolución de URL centralizado.
 *
 * Flujo:
 *   1. Resuelve la URL (agrega el dominio del backend si es /uploads/...)
 *   2. Intenta cargar la imagen real.
 *   3. Si falla o src es null/vacía, muestra el placeholder SVG.
 *
 * `loading`: 'lazy' por defecto — las tarjetas fuera de pantalla no bloquean
 * la carga inicial. La foto principal de la ficha de producto debe pasar
 * 'eager', porque es lo primero que el usuario mira.
 *
 * `onLoad` se propaga para que quien la use pueda leer naturalWidth y decidir,
 * por ejemplo, si tiene sentido ofrecer zoom (ver ProductGallery).
 */
function ProductImage({
  src,
  alt,
  className = '',
  style = {},
  loading = 'lazy',
  onLoad,
}) {
  const resolved = resolveImageUrl(src)
  const [failed, setFailed] = useState(!resolved)

  if (failed) {
    return (
      <img
        src={placeholderSvg}
        alt={alt || 'Sin imagen'}
        className={className}
        style={style}
        aria-label={alt}
      />
    )
  }

  return (
    <img
      src={resolved}
      alt={alt}
      className={className}
      style={style}
      loading={loading}
      decoding='async'
      onLoad={onLoad}
      onError={() => setFailed(true)}
    />
  )
}

export default ProductImage
