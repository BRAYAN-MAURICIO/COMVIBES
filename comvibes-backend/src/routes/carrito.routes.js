const { Router } = require('express')
const ctrl = require('../controllers/carrito.controller')
const { requireAuth } = require('../middleware/auth')

const { validar } = require('../middleware/validar')
const esquemas = require('../validation/esquemas')

const { carrito } = esquemas
const router = Router()

router.use(requireAuth)

router.get('/', ctrl.getCarrito)
router.post('/items', validar({ body: carrito.agregar }), ctrl.addItem)
router.put('/items/:idPro', validar({ body: carrito.actualizar }), ctrl.updateItem)
router.delete('/items/:idPro', ctrl.removeItem)
router.delete('/', ctrl.clearCarrito)
router.post('/sync', validar({ body: carrito.sincronizar }), ctrl.syncCarrito)

module.exports = router
