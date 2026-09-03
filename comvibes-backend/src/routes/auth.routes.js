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

const router = Router()

router.post('/register', loginLimiter, register)
router.post('/login',    loginLimiter, login)
router.get('/me',        requireAuth,  me)

// Verificación de correo (registro real, ya no simulado)
router.post('/verify-email',        verifyEmailLimiter,     verifyEmail)
router.post('/resend-verification', forgotPasswordLimiter,  resendVerification)

// FIX #1: forgotPasswordLimiter ahora efectivamente protege estas dos rutas
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword)
router.post('/reset-password',  forgotPasswordLimiter, resetPassword)

module.exports = router
