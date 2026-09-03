import { createContext, useContext } from 'react'
import { useOrders } from './OrdersContext'

const PagosContext = createContext(null)

// Igual que FacturasContext: el pago ya viene anidado en cada pedido
// (GET /pedidos), el backend lo crea solo durante el checkout — no hace
// falta un createPayment manual desde el frontend.
function PagosProvider({ children }) {
  const { pedidos } = useOrders()

  const getByOrder = (idPed) => pedidos.find((p) => p.idPed === idPed)?.pago || null

  const value = { getByOrder }

  return <PagosContext.Provider value={value}>{children}</PagosContext.Provider>
}

function usePagos() {
  const context = useContext(PagosContext)
  if (!context) {
    throw new Error('usePagos debe usarse dentro de un <PagosProvider>')
  }
  return context
}

export { PagosProvider, usePagos }
