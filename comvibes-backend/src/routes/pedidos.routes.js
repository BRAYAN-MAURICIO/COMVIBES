const { Router } = require('express')
const ctrl = require('../controllers/pedidos.controller')
const { requireAuth, requireAdmin } = require('../middleware/auth')

const router = Router()

router.use(requireAuth)

router.get('/', ctrl.listPedidos)
router.get('/:id', ctrl.getPedido)
router.post('/', ctrl.createPedido) // checkout: toma lo que haya en el carrito del usuario
router.patch('/:id/estado', requireAdmin, ctrl.cambiarEstadoPedido)

module.exports = router
