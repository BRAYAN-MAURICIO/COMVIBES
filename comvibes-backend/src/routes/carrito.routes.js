const { Router } = require('express')
const ctrl = require('../controllers/carrito.controller')
const { requireAuth } = require('../middleware/auth')

const router = Router()

router.use(requireAuth)

router.get('/', ctrl.getCarrito)
router.post('/items', ctrl.addItem)
router.put('/items/:idPro', ctrl.updateItem)
router.delete('/items/:idPro', ctrl.removeItem)
router.delete('/', ctrl.clearCarrito)
router.post('/sync', ctrl.syncCarrito)

module.exports = router
