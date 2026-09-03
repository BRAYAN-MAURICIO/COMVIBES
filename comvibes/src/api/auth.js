import { api } from './client'

export const login = (correo, password) => api.post('/auth/login', { correo, password })

export const register = (payload) => api.post('/auth/register', payload)

export const getMe = () => api.get('/auth/me')

// Verificación de correo (el registro ya no entrega sesión hasta verificar)
export const verifyEmail = (correo, codigo) => api.post('/auth/verify-email', { correo, codigo })

export const resendVerification = (correo) => api.post('/auth/resend-verification', { correo })

export const forgotPassword = (correo) => api.post('/auth/forgot-password', { correo })

export const resetPassword = (correo, codigo, passwordNueva) =>
  api.post('/auth/reset-password', { correo, codigo, passwordNueva })
