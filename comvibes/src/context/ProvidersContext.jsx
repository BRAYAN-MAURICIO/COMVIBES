import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import * as proveedoresApi from '../api/proveedores'
import { useAuth } from './AuthContext'

const ProvidersContext = createContext(null)

function ProvidersProvider({ children }) {
  const { isAdmin } = useAuth()
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchProveedores = useCallback(async () => {
    if (!isAdmin) {
      setProveedores([])
      return
    }
    setLoading(true)
    try {
      setProveedores(await proveedoresApi.getProveedores())
    } finally {
      setLoading(false)
    }
  }, [isAdmin])

  useEffect(() => {
    fetchProveedores()
  }, [fetchProveedores])

  const addProvider = async (datos) => {
    const nuevo = await proveedoresApi.createProveedor(datos)
    setProveedores((prev) => [...prev, nuevo])
    return nuevo
  }

  const updateProvider = async (idProv, cambios) => {
    const actualizado = await proveedoresApi.updateProveedor(idProv, cambios)
    setProveedores((prev) => prev.map((p) => (p.idProv === idProv ? actualizado : p)))
    return actualizado
  }

  const deleteProvider = async (idProv) => {
    await proveedoresApi.deleteProveedor(idProv)
    setProveedores((prev) => prev.filter((p) => p.idProv !== idProv))
  }

  const value = { proveedores, loading, addProvider, updateProvider, deleteProvider }

  return <ProvidersContext.Provider value={value}>{children}</ProvidersContext.Provider>
}

function useProviders() {
  const context = useContext(ProvidersContext)
  if (!context) {
    throw new Error('useProviders debe usarse dentro de un <ProvidersProvider>')
  }
  return context
}

export { ProvidersProvider, useProviders }
