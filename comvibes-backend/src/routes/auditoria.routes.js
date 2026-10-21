const { Router } = require('express')
const ctrl = require('../controllers/auditoria.controller')
const { requireAuth, requireAdmin } = require('../middleware/auth')

const router = Router()

router.use(requireAuth, requireAdmin)
router.get('/', ctrl.listar)

module.exports = router
