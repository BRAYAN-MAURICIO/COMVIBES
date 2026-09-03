import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import * as notificacionesApi from '../api/notificaciones'
import { useAuth } from './AuthContext'

const NotificationsContext = createContext(null)

// El backend ya crea la notificación solo (cuando OrderManagement cambia un
// estado, o cuando SupportManagement responde un ticket) — por eso ya no
// existe un addNotification manual acá, a diferencia de la versión mock.
function NotificationsProvider({ children }) {
  const { isAuthenticated, user } = useAuth()
  const [notificaciones, setNotificaciones] = useState([])
  const falloAvisado = useRef(false)

  const fetchNotificaciones = useCallback(async () => {
    if (!isAuthenticated) {
      setNotificaciones([])
      return
    }
    // Sin este catch, cada fallo de red se convertía en un "Uncaught (in
    // promise) Error" en consola. Y como esto se repite por polling cada 30s,
    // con el backend caído la consola se llenaba de errores idénticos.
    try {
      setNotificaciones(await notificacionesApi.getNotificaciones())
      falloAvisado.current = false
    } catch (err) {
      // Se conservan las notificaciones que ya estaban: un fallo puntual de red
      // no debería vaciar la campanita.
      if (!falloAvisado.current) {
        console.warn('[notificaciones] No se pudieron cargar:', err.message)
        falloAvisado.current = true
      }
    }
  }, [isAuthenticated])

  useEffect(() => {
    fetchNotificaciones()

    if (!isAuthenticated) return

    // No hay websockets, así que simulamos "tiempo real" con polling: cada
    // 30s mientras la pestaña esté activa, y también cuando el usuario
    // vuelve a la pestaña (ej. la dejó abierta en otra ventana y el admin
    // mientras tanto cambió el estado de su pedido).
    const intervalId = window.setInterval(fetchNotificaciones, 30000)

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchNotificaciones()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [fetchNotificaciones, user?.idUsu, isAuthenticated])

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
