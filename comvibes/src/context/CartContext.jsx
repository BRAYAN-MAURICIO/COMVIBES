import { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useProducts } from './ProductsContext'
import { useAuth } from './AuthContext'
import * as carritoApi from '../api/carrito'

const CartContext = createContext(null)
const STORAGE_KEY = 'comvibes_cart'

function CartProvider({ children }) {
  const { productos } = useProducts()
  const { isAuthenticated, loading: authLoading } = useAuth()

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
  // Regla de fusión: si el mismo producto está en ambos lados, se toma la
  // cantidad MAYOR (respetando el stock disponible). Antes se sumaban, pero
  // al recargar con la sesión abierta el mismo carrito puede estar en los dos
  // lados (el checkout lo sube al servidor) y sumar lo duplicaba.
  //
  // Corrección (auditoría ISO, fase 2): antes el carrito se borraba siempre
  // que no hubiera sesión, y al cargar la página SIEMPRE hay un instante sin
  // sesión mientras /auth/me responde. Resultado: recargar (F5) vaciaba el
  // carrito de un cliente con sesión abierta. Ahora se espera a que termine
  // esa comprobación y solo se limpia en la transición real de "con sesión"
  // a "sin sesión" (cerrar sesión o sesión expirada).
  const teniaSesion = useRef(false)
  useEffect(() => {
    if (authLoading) return
    const cerroSesion = teniaSesion.current && !isAuthenticated
    teniaSesion.current = isAuthenticated

    if (!isAuthenticated) {
      if (cerroSesion) {
        setItems([])
        localStorage.removeItem(STORAGE_KEY)
      }
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
              // La mayor de las dos (se recortará al stock en el siguiente useEffect)
              existente.cantidad = Math.max(existente.cantidad, localItem.cantidad)
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
  }, [isAuthenticated, authLoading])

  const getStock  = (idPro) => productos.find((p) => p.idPro === idPro)?.stock ?? Infinity
  // Precio vigente del catálogo. El ítem guarda el precio de cuando se agregó
  // (sirve de respaldo si el catálogo aún no cargó), pero se muestra y se suma
  // el actual, que es el que el backend cobra (auditoría ISO, H6).
  const getPrecio = useCallback(
    (item) => productos.find((p) => p.idPro === item.idPro)?.precio ?? item.precio,
    [productos]
  )
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

  // Los ítems que se exponen ya traen el precio vigente y la cantidad
  // recortada al stock disponible, así ShoppingCart y CheckoutFlow muestran
  // exactamente lo que se va a cobrar. Antes el recorte se hacía con un
  // useEffect que reescribía el carrito cada vez que cambiaba el catálogo;
  // derivarlo aquí es más simple y no borra nada: si el stock vuelve, la
  // cantidad que el cliente eligió sigue ahí.
  const itemsVigentes = useMemo(
    () =>
      items
        .map((item) => {
          const producto = productos.find((p) => p.idPro === item.idPro)
          const cantidad = producto ? Math.min(item.cantidad, producto.stock) : item.cantidad
          return { ...item, cantidad, precio: getPrecio(item) }
        })
        .filter((item) => item.cantidad > 0),
    [items, productos, getPrecio]
  )

  const total = useMemo(
    () => Math.round(itemsVigentes.reduce((acc, item) => acc + item.precio * item.cantidad, 0) * 100) / 100,
    [itemsVigentes]
  )

  const itemCount = useMemo(
    () => itemsVigentes.reduce((acc, item) => acc + item.cantidad, 0),
    [itemsVigentes]
  )

  const value = {
    items: itemsVigentes,
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
