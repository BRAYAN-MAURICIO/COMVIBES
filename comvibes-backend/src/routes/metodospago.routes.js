const { Router } = require('express')
const ctrl = require('../controllers/metodospago.controller')
const { requireAuth, requireAdmin } = require('../middleware/auth')

const { validar } = require('../middleware/validar')
const esquemas = require('../validation/esquemas')

const { metodosPago } = esquemas
const router = Router()

router.get('/', ctrl.list) // público: el checkout necesita mostrar los métodos disponibles
router.get('/:id', ctrl.getOne)
router.post('/', requireAuth, requireAdmin, validar({ body: metodosPago.crear }), ctrl.create)
router.put('/:id', requireAuth, requireAdmin, validar({ body: metodosPago.actualizar }), ctrl.update)
router.delete('/:id', requireAuth, requireAdmin, ctrl.remove)

module.exports = router
