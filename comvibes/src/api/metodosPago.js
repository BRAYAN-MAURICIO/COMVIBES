import { api } from './client'

export const getMetodosPago = () => api.get('/metodos-pago')

export const updateMetodoPago = (idMet, payload) => api.put(`/metodos-pago/${idMet}`, payload)
