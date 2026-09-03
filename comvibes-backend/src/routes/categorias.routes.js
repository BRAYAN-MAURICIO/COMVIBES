const { Router } = require('express')
const ctrl = require('../controllers/categorias.controller')
const { requireAuth, requireAdmin } = require('../middleware/auth')

const router = Router()

router.get('/', ctrl.list)       // público: el catálogo necesita listarlas para filtros
router.get('/:id', ctrl.getOne)
router.post('/', requireAuth, requireAdmin, ctrl.create)
router.put('/:id', requireAuth, requireAdmin, ctrl.update)
router.delete('/:id', requireAuth, requireAdmin, ctrl.remove)

module.exports = router
