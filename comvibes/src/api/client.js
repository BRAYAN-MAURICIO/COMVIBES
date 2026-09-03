import axios from 'axios'

const TOKEN_KEY = 'comvibes_token'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
})

// Adjunta el JWT guardado por AuthContext en cada petición, si existe.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// El backend siempre responde { success: true, data } o { success: false, message }.
// Esto deja que el resto del código trabaje directo con `data`, y convierte los
// errores en Error(message) para que los `catch` de las páginas sigan funcionando
// igual que cuando lanzábamos `new Error('...')` a mano contra los mocks.
api.interceptors.response.use(
  (response) => response.data?.data,
  (error) => {
    const status = error.response?.status
    const hadToken = Boolean(localStorage.getItem(TOKEN_KEY))

    // Si el JWT expiró o dejó de ser válido, la sesión ya no sirve: la
    // limpiamos y mandamos al usuario a login en vez de dejar que cada
    // pantalla reciba un 401 genérico. No aplica al propio intento de
    // login (ahí no había token guardado, así que hadToken es false).
    if (status === 401 && hadToken) {
      localStorage.removeItem(TOKEN_KEY)
      if (window.location.pathname !== '/login') {
        window.location.assign('/login?expired=1')
      }
    }

    const message = error.response?.data?.message || error.message || 'Error de red con el servidor.'
    // Conservamos `details` y `status`: el flujo de verificación de correo
    // necesita distinguir un 403 "falta verificar" de un 401 de credenciales.
    const err = new Error(message)
    err.status = status
    err.details = error.response?.data?.details
    return Promise.reject(err)
  }
)

export { api, TOKEN_KEY }
