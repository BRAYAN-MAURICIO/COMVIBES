import { createContext, useContext } from 'react'
import { useOrders } from './OrdersContext'

const FacturasContext = createContext(null)

// La factura ya viaja anidada en cada pedido (GET /pedidos la incluye), así
// que este Context no hace fetch propio — solo expone la misma forma
// getByOrder() que usaban las páginas, leyendo de OrdersContext.
function FacturasProvider({ children }) {
  const { pedidos } = useOrders()

  const getByOrder = (idPed) => pedidos.find((p) => p.idPed === idPed)?.factura || null

  const value = { getByOrder }

  return <FacturasContext.Provider value={value}>{children}</FacturasContext.Provider>
}

function useFacturas() {
  const context = useContext(FacturasContext)
  if (!context) {
    throw new Error('useFacturas debe usarse dentro de un <FacturasProvider>')
  }
  return context
}

export { FacturasProvider, useFacturas }
