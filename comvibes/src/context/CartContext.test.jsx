import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// Estado simulado de los contexts de los que depende el carrito.
const mocks = vi.hoisted(() => ({
  auth: { isAuthenticated: false, loading: false },
  productos: [],
  servidor: [],
}))

vi.mock('./AuthContext', () => ({ useAuth: () => mocks.auth }))
vi.mock('./ProductsContext', () => ({ useProducts: () => ({ productos: mocks.productos }) }))
vi.mock('../api/carrito', () => ({
  getCarrito: vi.fn(async () => ({ items: mocks.servidor })),
}))

const { CartProvider, useCart } = await import('./CartContext')

const STORAGE_KEY = 'comvibes_cart'
const wrapper = ({ children }) => <CartProvider>{children}</CartProvider>
const producto = (idPro, precio, stock) => ({ idPro, nombre: `P${idPro}`, precio, stock })

beforeEach(() => {
  mocks.auth = { isAuthenticated: false, loading: false }
  mocks.productos = []
  mocks.servidor = []
})

describe('CartContext', () => {
  it('muestra y suma el precio VIGENTE del catálogo, no el de cuando se agregó (H6)', () => {
    mocks.productos = [producto(1, 50000, 10)]
    const { result, rerender } = renderHook(() => useCart(), { wrapper })
    act(() => { result.current.addToCart(producto(1, 50000, 10), 2) })
    expect(result.current.total).toBe(100000)

    mocks.productos = [producto(1, 60000, 10)] // el admin sube el precio
    rerender()

    expect(result.current.items[0].precio).toBe(60000)
    expect(result.current.total).toBe(120000)
  })

  it('recorta la cantidad al stock disponible y oculta lo agotado, sin borrar lo elegido', () => {
    mocks.productos = [producto(1, 1000, 10), producto(2, 2000, 10)]
    const { result, rerender } = renderHook(() => useCart(), { wrapper })
    act(() => { result.current.addToCart(producto(1, 1000, 10), 5) })
    act(() => { result.current.addToCart(producto(2, 2000, 10), 1) })

    mocks.productos = [producto(1, 1000, 2), producto(2, 2000, 0)]
    rerender()
    expect(result.current.items).toEqual([expect.objectContaining({ idPro: 1, cantidad: 2 })])
    expect(result.current.itemCount).toBe(2)

    mocks.productos = [producto(1, 1000, 10), producto(2, 2000, 10)] // vuelve el stock
    rerender()
    expect(result.current.items.map((i) => i.cantidad)).toEqual([5, 1])
  })

  it('un producto que el admin desactivó sale del total y queda aparte como no disponible', () => {
    mocks.productos = [producto(1, 1000, 10), producto(2, 5000, 10)]
    const { result, rerender } = renderHook(() => useCart(), { wrapper })
    act(() => { result.current.addToCart(producto(1, 1000, 10), 1) })
    act(() => { result.current.addToCart(producto(2, 5000, 10), 1) })
    expect(result.current.total).toBe(6000)

    mocks.productos = [producto(1, 1000, 10)] // el 2 ya no está en el catálogo público
    rerender()
    expect(result.current.items.map((i) => i.idPro)).toEqual([1])
    expect(result.current.itemsNoDisponibles.map((i) => i.idPro)).toEqual([2])
    expect(result.current.total).toBe(1000)

    act(() => { result.current.removeFromCart(2) })
    expect(result.current.itemsNoDisponibles).toEqual([])
  })

  it('mientras el catálogo no ha cargado no marca nada como no disponible', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ idPro: 9, nombre: 'P9', precio: 700, cantidad: 1 }]))
    mocks.productos = []
    const { result } = renderHook(() => useCart(), { wrapper })
    expect(result.current.items).toHaveLength(1)
    expect(result.current.itemsNoDisponibles).toEqual([])
  })

  it('recargar la página con sesión abierta NO vacía el carrito (bug corregido en la fase 2)', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ idPro: 3, nombre: 'P3', precio: 900, cantidad: 2 }]))
    mocks.productos = [producto(3, 900, 10)]
    // Al cargar la página: la sesión todavía se está comprobando (/auth/me)
    mocks.auth = { isAuthenticated: false, loading: true }
    const { result, rerender } = renderHook(() => useCart(), { wrapper })
    expect(result.current.items).toHaveLength(1)

    // /auth/me responde: hay sesión
    mocks.auth = { isAuthenticated: true, loading: false }
    rerender()

    await waitFor(() => expect(result.current.syncing).toBe(false))
    expect(result.current.items).toEqual([expect.objectContaining({ idPro: 3, cantidad: 2 })])
  })

  it('al fusionar con el carrito del servidor toma la cantidad mayor, no la suma', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ idPro: 3, nombre: 'P3', precio: 900, cantidad: 2 }]))
    mocks.productos = [producto(3, 900, 10)]
    mocks.servidor = [{ idPro: 3, nombre: 'P3', precio: 900, cantidad: 2 }]
    mocks.auth = { isAuthenticated: true, loading: false }

    const { result } = renderHook(() => useCart(), { wrapper })

    await waitFor(() => expect(result.current.syncing).toBe(false))
    await waitFor(() => expect(result.current.items[0]?.cantidad).toBe(2))
  })

  it('cerrar sesión sí vacía el carrito y el respaldo local', async () => {
    mocks.productos = [producto(1, 1000, 10)]
    mocks.auth = { isAuthenticated: true, loading: false }
    const { result, rerender } = renderHook(() => useCart(), { wrapper })
    await waitFor(() => expect(result.current.syncing).toBe(false))
    act(() => { result.current.addToCart(producto(1, 1000, 10), 1) })
    expect(result.current.items).toHaveLength(1)

    mocks.auth = { isAuthenticated: false, loading: false }
    rerender()

    expect(result.current.items).toHaveLength(0)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')).toEqual([])
  })
})
