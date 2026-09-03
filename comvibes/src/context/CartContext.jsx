import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import { useProducts } from './ProductsContext'
import { useAuth } from './AuthContext'
import * as carritoApi from '../api/carrito'

const CartContext = createContext(null)
const STORAGE_KEY = 'comvibes_cart'

function CartProvider({ children }) {
  const { productos } = useProducts()
  const { isAuthenticated } = useAuth()

  // El carrito vive en estado local (fuente de verdad en todo momento).
  // Para invitados se persiste en localStorage.
  // Para usuarios autenticados se sincroniza con el backend al login.
  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return []
    try { return JSON.parse(saved) } catch { return [] }
  })

  const [syncing, setSyncing] = useState(false)

  // ── Persistencia en localStorage (siempre, como respaldo) ──────────────
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  // ── Sincronización al iniciar / cerrar sesión ───────────────────────────
  // Al cerrar sesión: limpiamos los ítems en memoria y en localStorage para
  // que el siguiente usuario no herede el carrito del anterior.
  // Al iniciar sesión: cargamos el carrito del servidor y lo fusionamos con
  // lo que el invitado tenía en localStorage antes de autenticarse.
  // Regla de fusión: si el mismo producto está en ambos lados, se suma la
  // cantidad (respetando el stock disponible).
  useEffect(() => {
    if (!isAuthenticated) {
      setItems([])
      localStorage.removeItem(STORAGE_KEY)
      return
    }

    const sync = async () => {
      setSyncing(true)
      try {
        const serverCart = await carritoApi.getCarrito()
        const serverItems = (serverCart?.items || []).map((i) => ({
          idPro: i.idPro,
          nombre: i.nombre,
          precio: Number(i.precio) || 0,
          imagen: i.imagen,
          cantidad: i.cantidad,
        }))

        setItems((localItems) => {
          // Fusionar: empezar con los ítems del servidor
          const merged = [...serverItems]

          for (const localItem of localItems) {
            const existente = merged.find((i) => i.idPro === localItem.idPro)
            if (existente) {
              // Sumar cantidad (se recortará al stock en el siguiente useEffect)
              existente.cantidad += localItem.cantidad
            } else {
              merged.push(localItem)
            }
          }

          return merged
        })
      } catch {
        // Si el servidor falla, el carrito local sigue funcionando
      } finally {
        setSyncing(false)
      }
    }

    sync()
  // Solo correr al cambiar el estado de autenticación
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  // ── Recortar cantidades si el stock bajó ────────────────────────────────
  useEffect(() => {
    setItems((prev) => {
      let changed = false
      const next = prev
        .map((item) => {
          const producto = productos.find((p) => p.idPro === item.idPro)
          const stockDisponible = producto ? producto.stock : item.cantidad
          if (item.cantidad > stockDisponible) {
            changed = true
            return { ...item, cantidad: stockDisponible }
          }
          return item
        })
        .filter((item) => item.cantidad > 0)
      return changed ? next : prev
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productos])

  const getStock  = (idPro) => productos.find((p) => p.idPro === idPro)?.stock ?? Infinity
  // Imagen actualizada del catálogo — evita mostrar foto obsoleta si el admin la cambia
  const getImagen = (idPro, fallback = null) =>
    productos.find((p) => p.idPro === idPro)?.imagen ?? fallback

  const addToCart = (product, cantidad = 1) => {
    const stockDisponible = getStock(product.idPro)
    const existing = items.find((item) => item.idPro === product.idPro)
    const cantidadActual = existing ? existing.cantidad : 0
    const cantidadDeseada = cantidadActual + cantidad
    const cantidadFinal = Math.max(0, Math.min(cantidadDeseada, stockDisponible))
    const capped = cantidadFinal < cantidadDeseada

    if (cantidadFinal === cantidadActual) {
      return { added: false, capped: true, cantidadFinal }
    }

    setItems((prev) => {
      const ex = prev.find((item) => item.idPro === product.idPro)
      if (ex) {
        return prev.map((item) =>
          item.idPro === product.idPro ? { ...item, cantidad: cantidadFinal } : item
        )
      }
      return [
        ...prev,
        {
          idPro: product.idPro,
          nombre: product.nombre,
          precio: product.precio,
          // No guardamos imagen aquí: se resuelve en tiempo de render desde
          // ProductsContext para que siempre refleje la foto actual del producto.
          cantidad: cantidadFinal,
        },
      ]
    })

    return { added: true, capped, cantidadFinal }
  }

  const removeFromCart = (idPro) => {
    setItems((prev) => prev.filter((item) => item.idPro !== idPro))
  }

  const updateQuantity = (idPro, cantidad) => {
    if (cantidad < 1) return { capped: false, cantidadFinal: 0 }
    const stockDisponible = getStock(idPro)
    const cantidadFinal = Math.min(cantidad, stockDisponible)
    const capped = cantidadFinal < cantidad
    setItems((prev) =>
      prev.map((item) => (item.idPro === idPro ? { ...item, cantidad: cantidadFinal } : item))
    )
    return { capped, cantidadFinal }
  }

  const clearCart = () => {
    setItems([])
    localStorage.removeItem(STORAGE_KEY)
  }

  const total = useMemo(
    () => items.reduce((acc, item) => acc + item.precio * item.cantidad, 0),
    [items]
  )

  const itemCount = useMemo(
    () => items.reduce((acc, item) => acc + item.cantidad, 0),
    [items]
  )

  const value = {
    items,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    total,
    itemCount,
    getStock,
    getImagen,
    syncing,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart debe usarse dentro de un <CartProvider>')
  }
  return context
}

export { CartProvider, useCart }
