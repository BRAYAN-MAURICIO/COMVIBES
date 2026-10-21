const { Router } = require('express')
const ctrl = require('../controllers/envios.controller')
const { requireAuth, requireAdmin } = require('../middleware/auth')

const { validar } = require('../middleware/validar')
const esquemas = require('../validation/esquemas')

const { envios } = esquemas
const router = Router()

router.use(requireAuth)

router.get('/pedido/:idPed', ctrl.getByPedido)
router.put('/pedido/:idPed', requireAdmin, validar({ body: envios.upsert }), ctrl.upsertEnvio)

module.exports = router
