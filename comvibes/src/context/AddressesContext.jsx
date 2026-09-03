import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import * as direccionesApi from '../api/direcciones'
import { useAuth } from './AuthContext'

const AddressesContext = createContext(null)

function AddressesProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [direcciones, setDirecciones] = useState([])

  const fetchDirecciones = useCallback(async () => {
    if (!isAuthenticated) {
      setDirecciones([])
      return
    }
    setDirecciones(await direccionesApi.getDirecciones())
  }, [isAuthenticated])

  useEffect(() => {
    fetchDirecciones()
  }, [fetchDirecciones])

  // El backend ya filtra por el usuario autenticado (o por ?idUsu= si es
  // admin), así que acá solo se ordena para dejar la predeterminada primero.
  const getByUser = () =>
    [...direcciones].sort((a, b) => Number(b.predeterminada) - Number(a.predeterminada))

  const addAddress = async ({ etiqueta, direccion, departamento, ciudad, telefono, predeterminada }) => {
    const nueva = await direccionesApi.createDireccion({ etiqueta, direccion, departamento, ciudad, telefono, predeterminada })
    await fetchDirecciones() // por si esta nueva quedó como predeterminada y hay que refrescar las demás
    return nueva
  }

  const updateAddress = async (idDir, cambios) => {
    const actualizada = await direccionesApi.updateDireccion(idDir, cambios)
    await fetchDirecciones()
    return actualizada
  }

  const deleteAddress = async (idDir) => {
    await direccionesApi.deleteDireccion(idDir)
    await fetchDirecciones()
  }

  const setDefault = async (idDir) => {
    await direccionesApi.updateDireccion(idDir, { predeterminada: true })
    await fetchDirecciones()
  }

  const value = { direcciones, getByUser, addAddress, updateAddress, deleteAddress, setDefault }

  return <AddressesContext.Provider value={value}>{children}</AddressesContext.Provider>
}

function useAddresses() {
  const context = useContext(AddressesContext)
  if (!context) {
    throw new Error('useAddresses debe usarse dentro de un <AddressesProvider>')
  }
  return context
}

export { AddressesProvider, useAddresses }
