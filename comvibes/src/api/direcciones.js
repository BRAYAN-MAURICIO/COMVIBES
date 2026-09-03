import { api } from './client'

export const getDirecciones = () => api.get('/direcciones')

export const createDireccion = (payload) => api.post('/direcciones', payload)

export const updateDireccion = (idDir, payload) => api.put(`/direcciones/${idDir}`, payload)

export const deleteDireccion = (idDir) => api.delete(`/direcciones/${idDir}`)
