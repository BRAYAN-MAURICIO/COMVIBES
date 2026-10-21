import { createContext, useContext, useEffect, useCallback, useRef } from 'react'
import * as notificacionesApi from '../api/notificaciones'
import { useAuth } from './AuthContext'
import { useCarga } from '../hooks/useCarga'

const NotificationsContext = createContext(null)

// El backend ya crea la notificación solo (cuando OrderManagement cambia un
// estado, o cuando SupportManagement responde un ticket) — por eso ya no
// existe un addNotification manual acá, a diferencia de la versión mock.
function NotificationsProvider({ children }) {
  const { isAuthenticated, user } = useAuth()
  const falloAvisado = useRef(false)

  const { datos: notificaciones, setDatos: setNotificaciones, recargar } = useCarga(
    notificacionesApi.getNotificaciones,
    { habilitado: isAuthenticated, clave: user?.idUsu, inicial: [] }
  )

  // Recarga para el polling. Sin este catch, cada fallo de red se convertía
  // en un "Uncaught (in promise) Error" en consola, y como se repite cada 30s,
  // con el backend caído la consola se llenaba de errores idénticos. Se
  // conservan las notificaciones que ya estaban: un fallo puntual de red no
  // debería vaciar la campanita.
  const fetchNotificaciones = useCallback(async () => {
    try {
      await recargar()
      falloAvisado.current = false
    } catch (err) {
      if (!falloAvisado.current) {
        console.warn('[notificaciones] No se pudieron cargar:', err.message)
        falloAvisado.current = true
      }
    }
  }, [recargar])

  // La primera carga la hace useCarga. Aquí solo el "tiempo real" por
  // polling (no hay websockets): cada 30s, y también cuando el usuario vuelve
  // a la pestaña (ej. la dejó abierta y mientras tanto el admin cambió el
  // estado de su pedido).
  useEffect(() => {
    if (!isAuthenticated) return undefined

    const intervalId = window.setInterval(fetchNotificaciones, 30000)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchNotificaciones()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [fetchNotificaciones, isAuthenticated])

  const getByUser = () => notificaciones

  const unreadCount = () => notificaciones.filter((n) => !n.leida).length

  const markAsRead = async (idNot) => {
    await notificacionesApi.marcarLeida(idNot)
    setNotificaciones((prev) => prev.map((n) => (n.idNot === idNot ? { ...n, leida: true } : n)))
  }

  const markAllAsRead = async () => {
    await notificacionesApi.marcarTodasLeidas()
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })))
  }

  const value = { notificaciones, getByUser, unreadCount, markAsRead, markAllAsRead, refetch: fetchNotificaciones }

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

function useNotifications() {
  const context = useContext(NotificationsContext)
  if (!context) {
    throw new Error('useNotifications debe usarse dentro de un <NotificationsProvider>')
  }
  return context
}

export { NotificationsProvider, useNotifications }
