const { Router } = require('express')
const ctrl = require('../controllers/proveedores.controller')
const { requireAuth, requireAdmin } = require('../middleware/auth')

const router = Router()

router.use(requireAuth, requireAdmin) // proveedores es 100% back-office

router.get('/', ctrl.list)
router.get('/:id', ctrl.getOne)
router.post('/', ctrl.create)
router.put('/:id', ctrl.update)
router.delete('/:id', ctrl.remove)

module.exports = router
