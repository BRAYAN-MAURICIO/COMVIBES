import { api } from './client'

export const getPagoByPedido = (idPed) => api.get(`/pagos/pedido/${idPed}`)
