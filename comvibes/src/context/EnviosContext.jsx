import { createContext, useContext } from 'react'
import * as enviosApi from '../api/envios'
import { useOrders } from './OrdersContext'

const EnviosContext = createContext(null)

// El envío también viaja anidado en cada pedido (GET /pedidos). Para leerlo
// no hace falta fetch propio; para editarlo (solo admin) sí se llama al
// backend y luego se refresca OrdersContext para que el dato anidado quede
// al día en todas las pantallas que lo usan.
function EnviosProvider({ children }) {
  const { pedidos, refetch } = useOrders()

  const getByOrder = (idPed) => pedidos.find((p) => p.idPed === idPed)?.envio || null

  const upsertShipment = async (idPed, { transportadora, numero_guia, fecha_estimada, estado_envio }) => {
    const actualizado = await enviosApi.upsertEnvio(idPed, { transportadora, numero_guia, fecha_estimada, estado_envio })
    await refetch()
    return actualizado
  }

  const value = { getByOrder, upsertShipment }

  return <EnviosContext.Provider value={value}>{children}</EnviosContext.Provider>
}

function useEnvios() {
  const context = useContext(EnviosContext)
  if (!context) {
    throw new Error('useEnvios debe usarse dentro de un <EnviosProvider>')
  }
  return context
}

export { EnviosProvider, useEnvios }
