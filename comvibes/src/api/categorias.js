import { api } from './client'

export const getCategorias = () => api.get('/categorias')

export const createCategoria = (payload) => api.post('/categorias', payload)

export const updateCategoria = (idCat, payload) => api.put(`/categorias/${idCat}`, payload)

export const deleteCategoria = (idCat) => api.delete(`/categorias/${idCat}`)
