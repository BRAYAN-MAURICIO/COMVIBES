import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

const mocks = vi.hoisted(() => ({
  pedidos: [],
  updateOrderStatus: vi.fn(),
  confirmar: true,
}))

vi.mock('../../context/OrdersContext', () => ({
  useOrders: () => ({ pedidos: mocks.pedidos, updateOrderStatus: mocks.updateOrderStatus }),
}))
vi.mock('../../context/EnviosContext', () => ({
  useEnvios: () => ({ getByOrder: () => null, upsertShipment: vi.fn() }),
}))
vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}))
vi.mock('sweetalert2', () => ({
  default: { fire: vi.fn(async () => ({ isConfirmed: mocks.confirmar })) },
}))

const Swal = (await import('sweetalert2')).default
const { default: OrderManagement } = await import('./OrderManagement')

const pedido = (idPed, estado) => ({
  idPed, estado, cliente: 'Ana Ruiz', fecha_pedido: '2026-09-20', total: 50000, detalle: [],
})

function renderizar() {
  return render(<MemoryRouter><OrderManagement /></MemoryRouter>)
}
const selectDe = (idPed) => screen.getByLabelText(`Estado del pedido #${idPed}`)
const opciones = (select) =>
  Object.fromEntries(within(select).getAllByRole('option').map((o) => [o.value, o.disabled]))

beforeEach(() => {
  mocks.updateOrderStatus.mockReset().mockResolvedValue({})
  mocks.confirmar = true
  Swal.fire.mockClear()
})

describe('OrderManagement — transiciones de estado (H2)', () => {
  it('un pedido Pendiente no ofrece saltar directo a Entregado', () => {
    mocks.pedidos = [pedido(1, 'Pendiente')]
    renderizar()
    expect(opciones(selectDe(1))).toEqual({
      Pendiente: false, 'En Camino': false, Entregado: true, Cancelado: false,
    })
  })

  it('Entregado y Cancelado son finales: el selector queda bloqueado', () => {
    mocks.pedidos = [pedido(2, 'Entregado'), pedido(3, 'Cancelado')]
    renderizar()
    expect(selectDe(2)).toBeDisabled()
    expect(selectDe(3)).toBeDisabled()
  })

  it('cancelar pide confirmación explicando que el stock vuelve al inventario', async () => {
    mocks.pedidos = [pedido(4, 'Pendiente')]
    renderizar()

    await userEvent.selectOptions(selectDe(4), 'Cancelado')

    expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({
      text: expect.stringMatching(/vuelven al inventario/),
      confirmButtonText: 'Sí, cancelar',
    }))
    expect(mocks.updateOrderStatus).toHaveBeenCalledWith(4, 'Cancelado')
  })

  it('si el admin se arrepiente en la confirmación, no se cambia nada', async () => {
    mocks.pedidos = [pedido(5, 'Pendiente')]
    mocks.confirmar = false
    renderizar()

    await userEvent.selectOptions(selectDe(5), 'Cancelado')

    expect(mocks.updateOrderStatus).not.toHaveBeenCalled()
  })

  it('pasar a En Camino no pide confirmación (se puede deshacer)', async () => {
    mocks.pedidos = [pedido(6, 'Pendiente')]
    renderizar()

    await userEvent.selectOptions(selectDe(6), 'En Camino')

    expect(Swal.fire).not.toHaveBeenCalled()
    expect(mocks.updateOrderStatus).toHaveBeenCalledWith(6, 'En Camino')
  })
})
