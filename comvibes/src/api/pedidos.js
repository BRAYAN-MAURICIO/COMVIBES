import { api } from './client'

export const getPedidos = (params = {}) => api.get('/pedidos', { params })

export const getPedido = (idPed) => api.get(`/pedidos/${idPed}`)

export const createPedido = ({ idDir, idMet }) => api.post('/pedidos', { idDir, idMet })

export const cambiarEstadoPedido = (idPed, estado) => api.patch(`/pedidos/${idPed}/estado`, { estado })
