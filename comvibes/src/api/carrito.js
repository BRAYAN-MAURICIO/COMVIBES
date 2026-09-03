import { api } from './client'

export const getCarrito = () => api.get('/carrito')

export const addItem = (idPro, cantidad) => api.post('/carrito/items', { idPro, cantidad })

export const updateItem = (idPro, cantidad) => api.put(`/carrito/items/${idPro}`, { cantidad })

export const removeItem = (idPro) => api.delete(`/carrito/items/${idPro}`)

export const clearCarrito = () => api.delete('/carrito')

// Reemplaza el carrito completo en una sola petición (usado por CheckoutFlow).
// Más robusto que clearCarrito + N addItem en serie.
export const syncCarrito = (items) => api.post('/carrito/sync', { items })
