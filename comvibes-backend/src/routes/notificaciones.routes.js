const { Router } = require('express')
const ctrl = require('../controllers/notificaciones.controller')
const { requireAuth } = require('../middleware/auth')

const router = Router()

router.use(requireAuth)

router.get('/', ctrl.listNotificaciones)
router.patch('/marcar-todas', ctrl.marcarTodasLeidas)
router.patch('/:id/leida', ctrl.marcarLeida)

module.exports = router
