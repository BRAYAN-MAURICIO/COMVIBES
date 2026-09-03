import { api } from './client'

export const getProveedores = () => api.get('/proveedores')

export const createProveedor = (payload) => api.post('/proveedores', payload)

export const updateProveedor = (idProv, payload) => api.put(`/proveedores/${idProv}`, payload)

export const deleteProveedor = (idProv) => api.delete(`/proveedores/${idProv}`)
