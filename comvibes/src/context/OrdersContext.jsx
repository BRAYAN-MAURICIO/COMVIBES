import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import * as pedidosApi from '../api/pedidos'
import { useAuth } from './AuthContext'

const OrdersContext = createContext(null)

function OrdersProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [pedidos, setPedidos] = useState([])

  // GET /pedidos ya devuelve, por cada pedido: detalle, envio, pago, factura
  // y un snapshot de la dirección — así que este único fetch alimenta a
  // OrdersContext, EnviosContext, PagosContext y FacturasContext a la vez.
  const fetchPedidos = useCallback(async () => {
    if (!isAuthenticated) {
      setPedidos([])
      return
    }
    const res = await pedidosApi.getPedidos()
    // El backend puede devolver array plano (admin sin paginar) o { pedidos, ... }
    setPedidos(Array.isArray(res) ? res : (res?.pedidos ?? []))
  }, [isAuthenticated])

  useEffect(() => {
    fetchPedidos()
  }, [fetchPedidos])

  // Checkout: el carrito ya debe estar sincronizado en el backend antes de
  // llamar esto (ver CheckoutFlow.jsx). El backend arma pedido + pago +
  // factura + envío en una sola transacción y descuenta el inventario.
  const createOrder = async ({ idDir, idMet }) => {
    const nuevoPedido = await pedidosApi.createPedido({ idDir, idMet })
    setPedidos((prev) => [nuevoPedido, ...prev])
    return nuevoPedido
  }

  const updateOrderStatus = async (idPed, estado) => {
    const actualizado = await pedidosApi.cambiarEstadoPedido(idPed, estado)
    setPedidos((prev) => prev.map((p) => (p.idPed === idPed ? actualizado : p)))
    return actualizado
  }

  const value = { pedidos, createOrder, updateOrderStatus, refetch: fetchPedidos }

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>
}

function useOrders() {
  const context = useContext(OrdersContext)
  if (!context) {
    throw new Error('useOrders debe usarse dentro de un <OrdersProvider>')
  }
  return context
}

export { OrdersProvider, useOrders }
