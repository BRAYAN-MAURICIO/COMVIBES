import { createContext, useContext } from 'react'
import * as wishlistApi from '../api/wishlist'
import { useAuth } from './AuthContext'
import { useCarga } from '../hooks/useCarga'

const WishlistContext = createContext(null)

function WishlistProvider({ children }) {
  const { isAuthenticated, user } = useAuth()
  const { datos: items, setDatos: setItems } = useCarga(wishlistApi.getWishlist, {
    habilitado: isAuthenticated,
    clave: user?.idUsu,
    inicial: [],
  })

  const isInWishlist = (idPro) => items.some((item) => item.idPro === idPro)

  // El backend hace toggle: agrega si no estaba, quita si ya estaba
  const toggleWishlist = async (product) => {
    const { items: updated } = await wishlistApi.toggleWishlist(product.idPro)
    setItems(updated)
  }

  const removeFromWishlist = async (idPro) => {
    const updated = await wishlistApi.removeFromWishlist(idPro) || []
    setItems(updated)
  }

  const value = { items, isInWishlist, toggleWishlist, removeFromWishlist }

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}

function useWishlist() {
  const context = useContext(WishlistContext)
  if (!context) {
    throw new Error('useWishlist debe usarse dentro de un <WishlistProvider>')
  }
  return context
}

export { WishlistProvider, useWishlist }
