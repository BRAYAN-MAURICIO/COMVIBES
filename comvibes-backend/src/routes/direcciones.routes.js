const { Router } = require('express')
const ctrl = require('../controllers/direcciones.controller')
const { requireAuth } = require('../middleware/auth')

const { validar } = require('../middleware/validar')
const esquemas = require('../validation/esquemas')

const { direcciones } = esquemas
const router = Router()

router.use(requireAuth)

router.get('/', ctrl.listDirecciones)
router.post('/', validar({ body: direcciones.crear }), ctrl.createDireccion)
router.put('/:id', validar({ body: direcciones.actualizar }), ctrl.updateDireccion)
router.delete('/:id', ctrl.deleteDireccion)

module.exports = router
