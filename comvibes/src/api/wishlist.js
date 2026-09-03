import { api } from './client'

export const getWishlist = () => api.get('/wishlist')

export const toggleWishlist = (idPro) => api.post('/wishlist', { idPro })

export const removeFromWishlist = (idPro) => api.delete(`/wishlist/${idPro}`)
