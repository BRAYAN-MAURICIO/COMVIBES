const { Router } = require('express')
const ctrl = require('../controllers/categorias.controller')
const { requireAuth, requireAdmin } = require('../middleware/auth')

const { validar } = require('../middleware/validar')
const esquemas = require('../validation/esquemas')

const { categorias } = esquemas
const router = Router()

router.get('/', ctrl.list)       // público: el catálogo necesita listarlas para filtros
router.get('/:id', ctrl.getOne)
router.post('/', requireAuth, requireAdmin, validar({ body: categorias.crear }), ctrl.create)
router.put('/:id', requireAuth, requireAdmin, validar({ body: categorias.actualizar }), ctrl.update)
router.delete('/:id', requireAuth, requireAdmin, ctrl.remove)

module.exports = router
