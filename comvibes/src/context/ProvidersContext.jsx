import { createContext, useContext } from 'react'
import * as proveedoresApi from '../api/proveedores'
import { useAuth } from './AuthContext'
import { useCarga } from '../hooks/useCarga'

const ProvidersContext = createContext(null)

function ProvidersProvider({ children }) {
  const { isAdmin, user } = useAuth()
  // Proveedores es 100% back-office: solo se piden con sesión de admin.
  const { datos: proveedores, setDatos: setProveedores, cargando: loading } = useCarga(proveedoresApi.getProveedores, {
    habilitado: isAdmin,
    clave: user?.idUsu,
    inicial: [],
  })

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
