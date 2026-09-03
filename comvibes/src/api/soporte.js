import { api } from './client'

export const getTickets = () => api.get('/soporte')

export const createTicket = (payload) => api.post('/soporte', payload)

export const responderTicket = (idTick, payload) => api.patch(`/soporte/${idTick}/responder`, payload)

export const cambiarEstadoTicket = (idTick, estado) => api.patch(`/soporte/${idTick}/estado`, { estado })
