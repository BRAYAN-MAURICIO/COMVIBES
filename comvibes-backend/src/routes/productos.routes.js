const { Router } = require('express')
const ctrl = require('../controllers/productos.controller')
const { requireAuth, requireAdmin, optionalAuth } = require('../middleware/auth')
const upload = require('../middleware/upload')

const { validar } = require('../middleware/validar')
const esquemas = require('../validation/esquemas')

const { productos } = esquemas
const router = Router()

// Catálogo público. optionalAuth deja ver productos inactivos SOLO al admin
// (antes cualquiera podía con ?includeInactive=1 o pidiendo el id; H16).
router.get('/', optionalAuth, ctrl.listProductos)
router.get('/:id', optionalAuth, ctrl.getProducto)

// Gestión (admin)
router.post('/', requireAuth, requireAdmin, validar({ body: productos.crear }), ctrl.createProducto)
router.put('/:id', requireAuth, requireAdmin, validar({ body: productos.actualizar }), ctrl.updateProducto)
router.delete('/:id', requireAuth, requireAdmin, ctrl.deleteProducto)
router.patch('/:id/stock', requireAuth, requireAdmin, validar({ body: productos.stock }), ctrl.updateStock)
router.post('/:id/imagenes', requireAuth, requireAdmin, validar({ body: productos.imagen }), upload.checkImageLimit, ctrl.addImagen)
router.delete('/:id/imagenes/:idImg', requireAuth, requireAdmin, ctrl.deleteImagen)

module.exports = router
