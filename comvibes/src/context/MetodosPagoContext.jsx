import { createContext, useContext } from 'react'
import * as metodosPagoApi from '../api/metodosPago'
import { useCarga } from '../hooks/useCarga'

const MetodosPagoContext = createContext(null)

function MetodosPagoProvider({ children }) {
  const { datos: metodos, setDatos: setMetodos, cargando: loading } = useCarga(metodosPagoApi.getMetodosPago, {
    inicial: [],
  })

  // Usado en Settings.jsx para activar/desactivar un método en el checkout
  const toggleMetodo = async (idMet, activo) => {
    const updated = await metodosPagoApi.updateMetodoPago(idMet, { activo })
    setMetodos((prev) => prev.map((m) => (m.idMet === idMet ? updated : m)))
    return updated
  }

  const value = { metodos, loading, toggleMetodo }

  return <MetodosPagoContext.Provider value={value}>{children}</MetodosPagoContext.Provider>
}

function useMetodosPago() {
  const context = useContext(MetodosPagoContext)
  if (!context) {
    throw new Error('useMetodosPago debe usarse dentro de un <MetodosPagoProvider>')
  }
  return context
}

export { MetodosPagoProvider, useMetodosPago }
