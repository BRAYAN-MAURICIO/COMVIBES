const { Router } = require('express')
const ctrl = require('../controllers/envios.controller')
const { requireAuth, requireAdmin } = require('../middleware/auth')

const router = Router()

router.use(requireAuth)

router.get('/pedido/:idPed', ctrl.getByPedido)
router.put('/pedido/:idPed', requireAdmin, ctrl.upsertEnvio)

module.exports = router
