import { api } from './client'

export const getFacturaByPedido = (idPed) => api.get(`/facturas/pedido/${idPed}`)
