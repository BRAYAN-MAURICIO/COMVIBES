import { api } from './client'

export const getPedidos = (params = {}) => api.get('/pedidos', { params })

export const getPedido = (idPed) => api.get(`/pedidos/${idPed}`)

// totalEsperado: el total que el cliente vio. Si el del servidor no coincide,
// el backend responde 409 con el detalle actualizado (auditoría ISO, H6).
export const createPedido = ({ idDir, idMet, totalEsperado }) =>
  api.post('/pedidos', { idDir, idMet, totalEsperado })

export const cambiarEstadoPedido = (idPed, estado) => api.patch(`/pedidos/${idPed}/estado`, { estado })
