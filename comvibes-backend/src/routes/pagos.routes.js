const { Router } = require('express')
const ctrl = require('../controllers/pagos.controller')
const { requireAuth } = require('../middleware/auth')

const router = Router()

router.use(requireAuth)
router.get('/pedido/:idPed', ctrl.getByPedido)

module.exports = router
