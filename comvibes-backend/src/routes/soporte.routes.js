const { Router } = require('express')
const ctrl = require('../controllers/soporte.controller')
const { requireAuth, requireAdmin, optionalAuth } = require('../middleware/auth')
const { soporteLimiter } = require('../middleware/rateLimit')

const { validar } = require('../middleware/validar')
const esquemas = require('../validation/esquemas')

const { soporte } = esquemas
const router = Router()

// Crear ticket es público (invitados pueden reportar un problema con solo su
// correo), pero optionalAuth cuelga req.user si mandan token para asociarlo
// a la cuenta. Ver y administrar tickets sigue exigiendo sesión.
// soporteLimiter: al ser público, sin límite se podía llenar la tabla de PQR
// con un script (auditoría ISO, H9).
router.post('/', soporteLimiter, optionalAuth, validar({ body: soporte.crear }), ctrl.createTicket)

router.use(requireAuth)

router.get('/', ctrl.listTickets)
router.patch('/:id/responder', requireAdmin, validar({ body: soporte.responder }), ctrl.responderTicket)
router.patch('/:id/estado', requireAdmin, validar({ body: soporte.estado }), ctrl.cambiarEstadoTicket)

module.exports = router
