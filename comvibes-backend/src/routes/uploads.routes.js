const { Router } = require('express')
const path   = require('path')
const fs     = require('fs')
const upload = require('../middleware/upload')
const { requireAuth, requireAdmin } = require('../middleware/auth')
const { ok, fail } = require('../utils/response')
const asyncHandler = require('../utils/asyncHandler')
const { procesarImagenProducto } = require('../utils/imagen')

const router = Router()

// POST /api/uploads/imagen (admin)
// Recibe un archivo con el campo "imagen", lo normaliza con sharp (lienzo
// cuadrado + WebP) y devuelve la URL pública relativa. Si la foto original
// venía demasiado chica, la respuesta incluye `advertencia` para que el panel
// admin lo muestre: se acepta igual, pero se avisa que se verá borrosa.
router.post(
  '/imagen',
  requireAuth,
  requireAdmin,
  upload.single('imagen'),
  asyncHandler(async (req, res) => {
    if (!req.file) return fail(res, 'No se recibió ningún archivo.')

    const img = await procesarImagenProducto(req.file.buffer)

    return ok(res, {
      url: `/uploads/productos/${img.filename}`,
      filename: img.filename,
      size: img.size,
      dimensiones: `${img.ancho}×${img.alto}`,
      original: `${img.anchoOriginal}×${img.altoOriginal}`,
      advertencia: img.advertencia,
    })
  })
)

// DELETE /api/uploads/imagen/:filename (admin)
// Elimina un archivo de la carpeta uploads/productos.
// El frontend lo llama cuando el admin quita una imagen del formulario
// ANTES de guardar el producto — así no quedan archivos huérfanos en disco.
router.delete(
  '/imagen/:filename',
  requireAuth,
  requireAdmin,
  (req, res) => {
    // Sanitizar: evitar path traversal (../../etc/passwd)
    const filename = path.basename(req.params.filename)
    const filepath = path.join(__dirname, '../../uploads/productos', filename)

    // Solo borrar archivos dentro de uploads/productos
    if (!filepath.startsWith(path.join(__dirname, '../../uploads/productos'))) {
      return fail(res, 'Ruta no permitida.', 403)
    }

    fs.unlink(filepath, (err) => {
      if (err && err.code !== 'ENOENT') {
        return fail(res, 'No se pudo eliminar el archivo.', 500)
      }
      // ENOENT = el archivo ya no existía → igual se responde OK
      return ok(res, { deleted: filename })
    })
  }
)

module.exports = router
