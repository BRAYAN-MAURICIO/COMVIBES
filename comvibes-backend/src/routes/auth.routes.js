const { Router } = require('express')
const {
  register,
  login,
  me,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
} = require('../controllers/auth.controller')
const { requireAuth } = require('../middleware/auth')
const { loginLimiter, forgotPasswordLimiter, verifyEmailLimiter } = require('../middleware/rateLimit')

const { validar } = require('../middleware/validar')
const esquemas = require('../validation/esquemas')

const { auth } = esquemas
const router = Router()

router.post('/register', loginLimiter, validar({ body: auth.registro }), register)
router.post('/login',    loginLimiter, validar({ body: auth.login }), login)
router.get('/me',        requireAuth,  me)

// Verificación de correo (registro real, ya no simulado)
router.post('/verify-email',        verifyEmailLimiter,    validar({ body: auth.verificar }),  verifyEmail)
router.post('/resend-verification', forgotPasswordLimiter, validar({ body: auth.soloCorreo }), resendVerification)

// FIX #1: forgotPasswordLimiter ahora efectivamente protege estas dos rutas
router.post('/forgot-password', forgotPasswordLimiter, validar({ body: auth.soloCorreo }), forgotPassword)
router.post('/reset-password',  forgotPasswordLimiter, validar({ body: auth.reset }),      resetPassword)

module.exports = router
