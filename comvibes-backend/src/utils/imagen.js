/**
 * Procesado de las imágenes de producto (sharp).
 *
 * Antes multer guardaba el archivo tal cual llegaba: entraban miniaturas de
 * 225×225 junto a PNG de 1.3 MB, con proporciones distintas. En la grilla eso
 * se ve borroso y desparejo. Aquí cada imagen se normaliza a:
 *
 *   - Lienzo CUADRADO con fondo blanco (así ninguna foto se recorta en la
 *     tarjeta y todas ocupan el mismo espacio).
 *   - Lado = el lado mayor del original, topado en 1200 px.
 *     Nunca se agranda: estirar una miniatura de 225 px a 1200 solo la vuelve
 *     borrosa Y pesada. Si entró chica, sale chica — pero avisamos.
 *   - Formato WebP calidad 82: ~30% menos peso que JPG con la misma nitidez.
 *   - Orientación EXIF aplicada (fotos de celular que salían acostadas).
 */

const path = require('path')
const fs = require('fs/promises')
const crypto = require('crypto')
const sharp = require('sharp')

const DIR_PRODUCTOS = path.join(__dirname, '../../uploads/productos')

const LADO_MAX = 1200              // techo del lienzo de salida
const LADO_MIN_RECOMENDADO = 600   // por debajo de esto se ve borroso: avisamos
const CALIDAD_WEBP = 82
const FONDO = { r: 255, g: 255, b: 255, alpha: 1 }

/**
 * Normaliza el buffer de una imagen subida y la escribe en uploads/productos.
 * Devuelve los datos que la ruta necesita para responder, incluida una
 * `advertencia` cuando el original venía por debajo del mínimo recomendado.
 */
async function procesarImagenProducto(buffer) {
  let meta
  try {
    meta = await sharp(buffer).metadata()
  } catch {
    throw new Error('El archivo no es una imagen válida o está dañado.')
  }

  const anchoOriginal = meta.width || 0
  const altoOriginal = meta.height || 0
  if (!anchoOriginal || !altoOriginal) {
    throw new Error('No se pudieron leer las dimensiones de la imagen.')
  }

  const lado = Math.min(LADO_MAX, Math.max(anchoOriginal, altoOriginal))

  const salida = await sharp(buffer)
    .rotate()                       // aplica la orientación EXIF del celular
    .flatten({ background: FONDO }) // PNG/WebP con transparencia → fondo blanco
    .resize(lado, lado, {
      fit: 'contain',
      background: FONDO,
      kernel: sharp.kernel.lanczos3, // el mejor remuestreo para reducir fotos
      withoutEnlargement: false,     // el lienzo puede crecer; la foto no (ver `lado`)
    })
    .webp({ quality: CALIDAD_WEBP, effort: 4 })
    .toBuffer()

  const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.webp`
  await fs.mkdir(DIR_PRODUCTOS, { recursive: true })
  await fs.writeFile(path.join(DIR_PRODUCTOS, filename), salida)

  const ladoMenor = Math.min(anchoOriginal, altoOriginal)
  const advertencia =
    ladoMenor < LADO_MIN_RECOMENDADO
      ? `La imagen mide ${anchoOriginal}×${altoOriginal} px. Por debajo de ${LADO_MIN_RECOMENDADO}×${LADO_MIN_RECOMENDADO} px se ve borrosa en la ficha del producto — conviene subir una más grande.`
      : null

  return {
    filename,
    size: salida.length,
    ancho: lado,
    alto: lado,
    anchoOriginal,
    altoOriginal,
    advertencia,
  }
}

module.exports = {
  procesarImagenProducto,
  LADO_MAX,
  LADO_MIN_RECOMENDADO,
  CALIDAD_WEBP,
  FONDO,
}
