const { Router } = require('express')
const ctrl = require('../controllers/proveedores.controller')
const { requireAuth, requireAdmin } = require('../middleware/auth')

const { validar } = require('../middleware/validar')
const esquemas = require('../validation/esquemas')

const { proveedores } = esquemas
const router = Router()

router.use(requireAuth, requireAdmin) // proveedores es 100% back-office

router.get('/', ctrl.list)
router.get('/:id', ctrl.getOne)
router.post('/', validar({ body: proveedores.crear }), ctrl.create)
router.put('/:id', validar({ body: proveedores.actualizar }), ctrl.update)
router.delete('/:id', ctrl.remove)

module.exports = router
