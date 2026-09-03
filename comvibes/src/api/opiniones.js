import { api } from './client'

export const getOpinionesByProducto = (idPro) => api.get(`/opiniones/producto/${idPro}`)

export const createOpinion = (payload) => api.post('/opiniones', payload)

export const deleteOpinion = (idOpi) => api.delete(`/opiniones/${idOpi}`)
