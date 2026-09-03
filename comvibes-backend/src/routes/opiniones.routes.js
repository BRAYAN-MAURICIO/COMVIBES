const { Router } = require('express')
const ctrl = require('../controllers/opiniones.controller')
const { requireAuth } = require('../middleware/auth')

const router = Router()

router.get('/producto/:idPro', ctrl.listByProducto) // público
router.post('/', requireAuth, ctrl.createOpinion)
router.delete('/:id', requireAuth, ctrl.deleteOpinion)

module.exports = router
