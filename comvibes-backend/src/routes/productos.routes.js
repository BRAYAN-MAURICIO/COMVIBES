const { Router } = require('express')
const ctrl = require('../controllers/productos.controller')
const { requireAuth, requireAdmin } = require('../middleware/auth')
const upload = require('../middleware/upload')

const router = Router()

// Catálogo público
router.get('/', ctrl.listProductos)
router.get('/:id', ctrl.getProducto)

// Gestión (admin)
router.post('/', requireAuth, requireAdmin, ctrl.createProducto)
router.put('/:id', requireAuth, requireAdmin, ctrl.updateProducto)
router.delete('/:id', requireAuth, requireAdmin, ctrl.deleteProducto)
router.patch('/:id/stock', requireAuth, requireAdmin, ctrl.updateStock)
router.post('/:id/imagenes', requireAuth, requireAdmin, upload.checkImageLimit, ctrl.addImagen)
router.delete('/:id/imagenes/:idImg', requireAuth, requireAdmin, ctrl.deleteImagen)

module.exports = router
