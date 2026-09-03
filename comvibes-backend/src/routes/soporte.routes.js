const { Router } = require('express')
const ctrl = require('../controllers/soporte.controller')
const { requireAuth, requireAdmin, optionalAuth } = require('../middleware/auth')

const router = Router()

// Crear ticket es público (invitados pueden reportar un problema con solo su
// correo), pero optionalAuth cuelga req.user si mandan token para asociarlo
// a la cuenta. Ver y administrar tickets sigue exigiendo sesión.
router.post('/', optionalAuth, ctrl.createTicket)

router.use(requireAuth)

router.get('/', ctrl.listTickets)
router.patch('/:id/responder', requireAdmin, ctrl.responderTicket)
router.patch('/:id/estado', requireAdmin, ctrl.cambiarEstadoTicket)

module.exports = router
