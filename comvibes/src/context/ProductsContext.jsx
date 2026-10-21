import { createContext, useContext } from 'react'
import * as productosApi from '../api/productos'
import { useAuth } from './AuthContext'
import { useCarga } from '../hooks/useCarga'

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

// Carga en lotes de 50 (límite del backend) hasta tener todos, para no
// superar el máximo por petición y evitar timeouts.
async function cargarCatalogoCompleto() {
  let pagina = 1
  let todos = []
  let total

  for (;;) {
    const res = await productosApi.getProductos({ page: pagina, limit: 50 })
    const lote = res?.productos ?? (Array.isArray(res) ? res : [])
    todos = [...todos, ...lote]
    total = res?.total ?? lote.length

    // Parar si ya tenemos todos, si el lote vino incompleto,
    // o si superamos el límite de seguridad ADMIN_LIMIT
    if (lote.length < 50 || todos.length >= total || todos.length >= ADMIN_LIMIT) break
    pagina++
  }
  return { productos: todos, total }
}

const SIN_PRODUCTOS = { productos: [], total: 0 }

function ProductsProvider({ children }) {
  // El backend solo incluye productos inactivos cuando quien pide es admin
  // (auditoría ISO, H16). Por eso el rol va como `clave`: si un admin inicia
  // sesión sin recargar la página, la lista se vuelve a pedir; si no, se
  // quedaría con la lista pública.
  const { user } = useAuth()
  const { datos, setDatos, cargando: loading, recargar } = useCarga(cargarCatalogoCompleto, {
    clave: user?.rol ?? null,
    inicial: SIN_PRODUCTOS,
  })
  const productos = datos.productos
  const totalProductos = datos.total
  const fetchProductos = recargar
  const setProductos = (actualizar) =>
    setDatos((prev) => ({ ...prev, productos: actualizar(prev.productos) }))

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
