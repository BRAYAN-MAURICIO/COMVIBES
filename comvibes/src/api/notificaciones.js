import { api } from './client'

export const getNotificaciones = () => api.get('/notificaciones')

export const marcarLeida = (idNot) => api.patch(`/notificaciones/${idNot}/leida`)

export const marcarTodasLeidas = () => api.patch('/notificaciones/marcar-todas')
