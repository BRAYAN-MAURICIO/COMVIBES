import { createContext, useContext, useState, useEffect } from 'react'
import { TOKEN_KEY } from '../api/client'
import * as authApi from '../api/auth'

const AuthContext = createContext(null)

// Registro y recuperación de contraseña van 100% contra el backend real:
// los códigos de 6 dígitos se envían por correo (Nodemailer) y se validan
// contra la BD. Aquí no queda nada simulado ni en localStorage.

function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Al montar, si hay un token guardado, valida la sesión contra /auth/me
  // en vez de confiar ciegamente en lo que había en localStorage.
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      setLoading(false)
      return
    }
    authApi
      .getMe()
      .then((usuario) => setUser(usuario))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false))
  }, [])

  const login = async (correo, password) => {
    const { usuario, token } = await authApi.login(correo, password)
    localStorage.setItem(TOKEN_KEY, token)
    setUser(usuario)
    return usuario
  }

  // El registro ya NO inicia sesión: crea la cuenta en estado "pendiente" y
  // el backend manda un código al correo. La sesión se abre en verifyEmail.
  const register = async ({ nombre, apellido, correo, password, documento_id }) => {
    return authApi.register({ nombre, apellido, correo, password, documento_id })
  }

  // Verifica el código del correo y, si es correcto, deja la sesión abierta.
  const verifyEmail = async (correo, codigo) => {
    const { usuario, token } = await authApi.verifyEmail(correo, codigo)
    localStorage.setItem(TOKEN_KEY, token)
    setUser(usuario)
    return usuario
  }

  const resendVerification = (correo) => authApi.resendVerification(correo)

  const logout = () => {
    setUser(null)
    localStorage.removeItem(TOKEN_KEY)
  }

  // --- Recuperación de contraseña ---
  // El backend guarda el hash del código en password_resets (válido 10 min)
  // y envía el código en claro únicamente al correo del usuario.

  const requestPasswordReset = async (correo) => {
    await authApi.forgotPassword(correo)
  }

  const resetPassword = async (correo, code, newPassword) => {
    await authApi.resetPassword(correo, code, newPassword)
  }

  // Revalida la sesión contra /auth/me y actualiza el user en memoria.
  // Lo usa UserProfile después de guardar el perfil para que el nombre en
  // el header/sidebar cambie al instante sin necesidad de refrescar la página.
  const refreshUser = async () => {
    try {
      const usuario = await authApi.getMe()
      setUser(usuario)
      return usuario
    } catch {
      // si falla silenciosamente, el user sigue igual
    }
  }

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user),
    isAdmin: user?.rol === 'admin',
    login,
    register,
    verifyEmail,
    resendVerification,
    logout,
    refreshUser,
    requestPasswordReset,
    resetPassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un <AuthProvider>')
  }
  return context
}

export { AuthProvider, useAuth }
