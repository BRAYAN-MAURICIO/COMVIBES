import { createContext, useContext } from 'react'
import * as soporteApi from '../api/soporte'
import { useAuth } from './AuthContext'
import { useCarga } from '../hooks/useCarga'

const SupportContext = createContext(null)

function SupportProvider({ children }) {
  const { isAuthenticated, user } = useAuth()
  const { datos: tickets, setDatos: setTickets, recargar: fetchTickets } = useCarga(soporteApi.getTickets, {
    habilitado: isAuthenticated,
    clave: user?.idUsu,
    inicial: [],
  })

  // El backend acepta tickets de invitados (sin sesión) si mandamos
  // nombre/correo; con sesión esos campos se ignoran y usa los de la cuenta.
  const createTicket = async ({ asunto, descripcion, nombre, correo }) => {
    const nuevo = await soporteApi.createTicket({ asunto, descripcion, nombre, correo })
    if (isAuthenticated) setTickets((prev) => [nuevo, ...prev])
    return nuevo
  }

  const reemplazar = (actualizado) => {
    setTickets((prev) => prev.map((t) => (t.idTick === actualizado.idTick ? actualizado : t)))
    return actualizado
  }

  /**
   * Guarda la respuesta del asesor y dispara el correo al cliente.
   * El ticket queda 'En Progreso' por defecto: responder no lo cierra, para
   * que el cliente pueda replicar sobre la misma solicitud.
   * Devuelve el ticket con `correo_enviado` y `aviso_correo`.
   */
  const responderTicket = async (idTick, respuesta_admin, estado = 'En Progreso') =>
    reemplazar(await soporteApi.responderTicket(idTick, { respuesta_admin, estado }))

  /** Cambia solo el estado. Pasar a 'Cerrado' le avisa al cliente por correo. */
  const cambiarEstado = async (idTick, estado) =>
    reemplazar(await soporteApi.cambiarEstadoTicket(idTick, estado))

  const cerrarTicket = (idTick) => cambiarEstado(idTick, 'Cerrado')

  const value = {
    tickets,
    fetchTickets,
    createTicket,
    responderTicket,
    cambiarEstado,
    cerrarTicket,
  }

  return <SupportContext.Provider value={value}>{children}</SupportContext.Provider>
}

function useSupport() {
  const context = useContext(SupportContext)
  if (!context) {
    throw new Error('useSupport debe usarse dentro de un <SupportProvider>')
  }
  return context
}

export { SupportProvider, useSupport }
