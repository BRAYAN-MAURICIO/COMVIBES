const rateLimit = require('express-rate-limit')

// Limita los intentos de login por IP para frenar ataques de fuerza bruta
// contra contraseñas. 10 intentos cada 15 minutos es suficiente para un
// usuario real que se equivoca escribiendo, pero corta un ataque automatizado.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en unos minutos.',
  },
  // Solo cuenta intentos fallidos, para no bloquear a alguien que ya
  // inició sesión correctamente varias veces seguidas (ej. varias pestañas).
  skipSuccessfulRequests: true,
})


// ── Límite para recuperación de contraseña ───────────────────────────────
// Cubre también /resend-verification: ambos disparan el envío de un correo,
// así que comparten el mismo techo para no convertir el API en un relay de spam.
const forgotPasswordLimiter = rateLimit({
  windowMs:        60 * 60 * 1000,
  max:             5,
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    success: false,
    message: 'Demasiadas solicitudes de recuperación. Intenta de nuevo en 1 hora.',
  },
  skipSuccessfulRequests: true,
})


// ── Límite para la verificación del código de correo ─────────────────────
// Aquí NO se envía correo, solo se comprueba un código de 6 dígitos, así que
// el techo puede ser más alto que el de envío. Aun así hay que limitarlo: sin
// esto, un atacante podría probar los 10^6 códigos posibles. La columna
// 'intentos' de la tabla corta por código; este limiter corta por IP.
const verifyEmailLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             15,
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    success: false,
    message: 'Demasiados intentos de verificación. Espera unos minutos y vuelve a intentarlo.',
  },
  skipSuccessfulRequests: true,
})

module.exports = { forgotPasswordLimiter, loginLimiter, verifyEmailLimiter }
