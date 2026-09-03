const multer = require('multer')
const { pool } = require('../config/db')

// El archivo se recibe EN MEMORIA, no en disco: src/utils/imagen.js lo
// normaliza con sharp (lienzo cuadrado, WebP, orientación EXIF) y recién
// entonces lo escribe en uploads/productos. Guardarlo antes solo dejaría
// basura en disco cada vez que el procesado falla.
const storage = multer.memoryStorage()

const fileFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (allowed.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Solo se permiten imágenes JPG, PNG, WEBP o GIF.'))
  }
}

// 8 MB de entrada. El límite anterior de 2 MB obligaba al admin a subir
// fotos ya comprimidas (de ahí las miniaturas de 225 px). Ahora puede subir
// la foto buena: sharp la deja en ~100-200 KB antes de tocar el disco.
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024 },
})

// Middleware que valida que el producto no supere MAX_IMAGENES fotos
// antes de aceptar la subida. Se encadena DESPUÉS de upload.single().
const MAX_IMAGENES = 5

async function checkImageLimit(req, res, next) {
  // Solo aplica si la ruta trae :id (subida asociada a un producto)
  const idPro = req.params?.id
  if (!idPro) return next()

  try {
    const [rows] = await pool.query(
      'SELECT COUNT(*) AS total FROM producto_imagenes WHERE idPro = ?',
      [idPro]
    )
    const total = Number(rows[0]?.total ?? 0)
    if (total >= MAX_IMAGENES) {
      return res.status(400).json({
        success: false,
        message: `Este producto ya tiene el máximo de ${MAX_IMAGENES} imágenes permitidas.`,
      })
    }
    next()
  } catch (err) {
    next(err)
  }
}

module.exports = upload
module.exports.checkImageLimit = checkImageLimit
module.exports.MAX_IMAGENES = MAX_IMAGENES
