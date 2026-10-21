import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useCarga } from './useCarga'

// Promesa que se resuelve a mano, para controlar el orden de las respuestas.
function diferida() {
  let resolver
  const promesa = new Promise((r) => { resolver = r })
  return { promesa, resolver }
}

describe('useCarga', () => {
  it('carga los datos y marca cargando mientras tanto', async () => {
    const cargar = vi.fn().mockResolvedValue(['a', 'b'])
    const { result } = renderHook(() => useCarga(cargar, { inicial: [] }))

    expect(result.current.cargando).toBe(true)
    expect(result.current.datos).toEqual([])
    await waitFor(() => expect(result.current.cargando).toBe(false))
    expect(result.current.datos).toEqual(['a', 'b'])
  })

  it('deshabilitado no pide nada y devuelve el valor inicial', () => {
    const cargar = vi.fn()
    const { result } = renderHook(() => useCarga(cargar, { habilitado: false, inicial: [] }))
    expect(cargar).not.toHaveBeenCalled()
    expect(result.current.datos).toEqual([])
    expect(result.current.cargando).toBe(false)
  })

  it('al cambiar la clave (otra cuenta) deja de mostrar los datos anteriores de inmediato', async () => {
    const cargar = vi.fn()
      .mockResolvedValueOnce(['pedido de Ana'])
      .mockReturnValueOnce(new Promise(() => {})) // la de Luis nunca llega
    const { result, rerender } = renderHook(({ clave }) => useCarga(cargar, { clave, inicial: [] }), {
      initialProps: { clave: 1 },
    })
    await waitFor(() => expect(result.current.datos).toEqual(['pedido de Ana']))

    rerender({ clave: 2 })

    expect(result.current.datos).toEqual([])
    expect(result.current.cargando).toBe(true)
  })

  it('descarta una respuesta vieja que llega después de la nueva', async () => {
    const vieja = diferida()
    const nueva = diferida()
    const cargarViejo = () => vieja.promesa
    const cargarNuevo = () => nueva.promesa
    const { result, rerender } = renderHook(({ cargar }) => useCarga(cargar, { inicial: null }), {
      initialProps: { cargar: cargarViejo },
    })

    rerender({ cargar: cargarNuevo })
    await act(async () => { nueva.resolver('página 2') })
    await act(async () => { vieja.resolver('página 1') })

    expect(result.current.datos).toBe('página 2')
  })

  it('expone el error sin romper y deja los datos en el valor inicial', async () => {
    const cargar = vi.fn().mockRejectedValue(new Error('backend caído'))
    const { result } = renderHook(() => useCarga(cargar, { inicial: [] }))
    await waitFor(() => expect(result.current.error?.message).toBe('backend caído'))
    expect(result.current.datos).toEqual([])
    expect(result.current.cargando).toBe(false)
  })

  it('setDatos permite actualizar después de crear o editar', async () => {
    const cargar = vi.fn().mockResolvedValue([1, 2])
    const { result } = renderHook(() => useCarga(cargar, { inicial: [] }))
    await waitFor(() => expect(result.current.datos).toEqual([1, 2]))
    act(() => result.current.setDatos((prev) => [...prev, 3]))
    expect(result.current.datos).toEqual([1, 2, 3])
  })

  it('recargar vuelve a pedir y devuelve los datos nuevos', async () => {
    const cargar = vi.fn().mockResolvedValueOnce([1]).mockResolvedValueOnce([1, 2])
    const { result } = renderHook(() => useCarga(cargar, { inicial: [] }))
    await waitFor(() => expect(result.current.datos).toEqual([1]))
    let devuelto
    await act(async () => { devuelto = await result.current.recargar() })
    expect(devuelto).toEqual([1, 2])
    expect(result.current.datos).toEqual([1, 2])
  })
})
