import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import * as productosApi from '../api/productos'

const ProductsContext = createContext(null)

// El backend espera imagen_url (singular) en el body de crear/editar, aunque
// en las respuestas GET ya devuelve `imagen` (alias) para no romper nada que
// lea el catálogo. Este helper traduce el payload del formulario al que
// espera el POST/PUT.
function toBackendPayload({ imagen, ...rest }) {
  return { ...rest, imagen_url: imagen }
}

// Límite de productos que el panel admin carga en memoria.
// StockManagement y Reports trabajan con la lista completa del lado del cliente,
// por eso se usa un número alto. Cuando el catálogo supere este valor habrá
// que migrar esas páginas a paginación server-side también.
const ADMIN_LIMIT = 500

function ProductsProvider({ children }) {
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalProductos, setTotalProductos] = useState(0)

  const fetchProductos = useCallback(async () => {
    setLoading(true)
    try {
      // Carga en lotes de 50 (límite del backend) hasta tener todos,
      // para no superar el máximo por petición y evitar timeouts.
      let pagina = 1
      let todos = []
      let hayMas = true

      while (hayMas) {
        const res = await productosApi.getProductos({ page: pagina, limit: 50 })
        const lote = res?.productos ?? (Array.isArray(res) ? res : [])
        todos = [...todos, ...lote]

        const total = res?.total ?? lote.length
        setTotalProductos(total)

        // Parar si ya tenemos todos, si el lote vino vacío,
        // o si superamos el límite de seguridad ADMIN_LIMIT
        if (lote.length < 50 || todos.length >= total || todos.length >= ADMIN_LIMIT) {
          hayMas = false
        } else {
          pagina++
        }
      }

      setProductos(todos)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProductos()
  }, [fetchProductos])

  const createProduct = async (payload) => {
    const created = await productosApi.createProducto(toBackendPayload(payload))
    setProductos((prev) => [created, ...prev])
    return created
  }

  // El PUT base no toca stock ni galería (esos son endpoints propios del backend),
  // así que si el formulario trae `stock` se manda aparte con PATCH /stock.
  const updateProduct = async (idPro, updates) => {
    const { stock, ...baseUpdates } = updates
    const updated = await productosApi.updateProducto(idPro, toBackendPayload(baseUpdates))
    if (stock != null) {
      await productosApi.updateStock(idPro, stock)
    }
    await fetchProductos() // más simple que mergear a mano imagen/stock/categoria
    return updated
  }

  const deleteProduct = async (idPro) => {
    await productosApi.deleteProducto(idPro)
    setProductos((prev) => prev.filter((p) => p.idPro !== idPro))
  }

  const setStock = async (idPro, stock) => {
    await productosApi.updateStock(idPro, stock)
    setProductos((prev) => prev.map((p) => (p.idPro === idPro ? { ...p, stock } : p)))
  }

  const value = { productos, loading, totalProductos, createProduct, updateProduct, deleteProduct, setStock, refetch: fetchProductos }

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>
}

function useProducts() {
  const context = useContext(ProductsContext)
  if (!context) {
    throw new Error('useProducts debe usarse dentro de un <ProductsProvider>')
  }
  return context
}

export { ProductsProvider, useProducts }
