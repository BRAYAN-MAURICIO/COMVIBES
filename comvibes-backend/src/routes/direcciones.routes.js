const { Router } = require('express')
const ctrl = require('../controllers/direcciones.controller')
const { requireAuth } = require('../middleware/auth')

const router = Router()

router.use(requireAuth)

router.get('/', ctrl.listDirecciones)
router.post('/', ctrl.createDireccion)
router.put('/:id', ctrl.updateDireccion)
router.delete('/:id', ctrl.deleteDireccion)

module.exports = router
