import { api } from './client'

export const getEnvioByPedido = (idPed) => api.get(`/envios/pedido/${idPed}`)

export const upsertEnvio = (idPed, payload) => api.put(`/envios/pedido/${idPed}`, payload)
