import { createContext, useContext } from 'react'
import * as categoriasApi from '../api/categorias'
import { useCarga } from '../hooks/useCarga'

const CategoriesContext = createContext(null)

// No existía como Context propio — categoriasMock.json se importaba directo
// en 5 páginas distintas. Se centraliza acá para que las categorías vengan
// de la BD real y un admin pueda crear/editar/borrar sin tocar código.
function CategoriesProvider({ children }) {
  const { datos: categorias, setDatos: setCategorias, cargando: loading } = useCarga(categoriasApi.getCategorias, {
    inicial: [],
  })

  const createCategory = async (payload) => {
    const created = await categoriasApi.createCategoria(payload)
    setCategorias((prev) => [...prev, created])
    return created
  }

  const updateCategory = async (idCat, updates) => {
    const updated = await categoriasApi.updateCategoria(idCat, updates)
    setCategorias((prev) => prev.map((c) => (c.idCat === idCat ? updated : c)))
    return updated
  }

  const deleteCategory = async (idCat) => {
    await categoriasApi.deleteCategoria(idCat)
    setCategorias((prev) => prev.filter((c) => c.idCat !== idCat))
  }

  const value = { categorias, loading, createCategory, updateCategory, deleteCategory }

  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>
}

function useCategories() {
  const context = useContext(CategoriesContext)
  if (!context) {
    throw new Error('useCategories debe usarse dentro de un <CategoriesProvider>')
  }
  return context
}

export { CategoriesProvider, useCategories }
