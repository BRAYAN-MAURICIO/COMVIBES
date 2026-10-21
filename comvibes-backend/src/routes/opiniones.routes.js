const { Router } = require('express')
const ctrl = require('../controllers/opiniones.controller')
const { requireAuth } = require('../middleware/auth')

const { validar } = require('../middleware/validar')
const esquemas = require('../validation/esquemas')

const { opiniones } = esquemas
const router = Router()

router.get('/producto/:idPro', ctrl.listByProducto) // público
router.post('/', requireAuth, validar({ body: opiniones.crear }), ctrl.createOpinion)
router.delete('/:id', requireAuth, ctrl.deleteOpinion)

module.exports = router
