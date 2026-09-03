import { api } from './client'

// Catálogo público paginado — usado por ProductCatalog
export const getCatalogo = (params = {}) => api.get('/productos', { params })

// Lista para el admin (incluye inactivos). Sin limit explícito el backend
// aplica su máximo (50), pero el admin puede pedir más pasando limit en params.
// ProductsContext lo llama con limit:500 para tener todo en memoria para
// StockManagement y Reports — cuando el catálogo crezca mucho se migrará
// a paginación real en esas páginas también.
export const getProductos = (params = {}) =>
  api.get('/productos', { params: { ...params, includeInactive: true } })

export const getProducto = (idPro) => api.get(`/productos/${idPro}`)

export const createProducto = (payload) => api.post('/productos', payload)

export const updateProducto = (idPro, payload) => api.put(`/productos/${idPro}`, payload)

export const deleteProducto = (idPro) => api.delete(`/productos/${idPro}`)

export const updateStock = (idPro, cantidad_disp) =>
  api.patch(`/productos/${idPro}/stock`, { cantidad_disp })
