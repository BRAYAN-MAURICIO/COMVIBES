const { Router } = require('express')
const ctrl = require('../controllers/pedidos.controller')
const { requireAuth, requireAdmin } = require('../middleware/auth')

const { validar } = require('../middleware/validar')
const esquemas = require('../validation/esquemas')

const { pedidos } = esquemas
const router = Router()

router.use(requireAuth)

router.get('/', ctrl.listPedidos)
router.get('/:id', ctrl.getPedido)
router.post('/', validar({ body: pedidos.crear }), ctrl.createPedido) // checkout: toma lo que haya en el carrito del usuario
router.patch('/:id/estado', requireAdmin, validar({ body: pedidos.estado }), ctrl.cambiarEstadoPedido)

module.exports = router
