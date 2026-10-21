import { createContext, useContext, useState, useCallback } from 'react'
import * as opinionesApi from '../api/opiniones'
import { getPedidos } from '../api/pedidos'
import { useAuth } from './AuthContext'
import { useCarga } from '../hooks/useCarga'

const ReviewsContext = createContext(null)
const SIN_COMPRAS = new Set()

// idPro de los productos que el usuario compró (pedido Entregado o En Camino):
// habilita el formulario de reseña sin esperar al backend.
async function cargarComprados() {
  const pedidos = await getPedidos()
  const ids = new Set()
  ;(Array.isArray(pedidos) ? pedidos : []).forEach((p) => {
    if (p.estado === 'Entregado' || p.estado === 'En Camino') {
      ;(p.detalle || []).forEach((d) => ids.add(d.idPro))
    }
  })
  return ids
}

// A diferencia del resto, las reseñas NO se precargan todas al montar la
// app (no hay un endpoint "todas las opiniones", y no haría falta: se
// cargan por producto, bajo demanda, desde ProductDetail).
function ReviewsProvider({ children }) {
  const { isAuthenticated, user } = useAuth()
  // Las reseñas son públicas: el caché por producto no depende de la sesión.
  const [reviewsByProduct, setReviewsByProduct] = useState({}) // { [idPro]: Review[] }
  // Las compras sí son de la sesión: al cambiar de cuenta se descartan solas.
  const { datos: purchasedProducts } = useCarga(cargarComprados, {
    habilitado: isAuthenticated,
    clave: user?.idUsu,
    inicial: SIN_COMPRAS,
  })

  const loadReviews = useCallback(async (idPro) => {
    const data = await opinionesApi.getOpinionesByProducto(idPro)
    setReviewsByProduct((prev) => ({ ...prev, [idPro]: data }))
    return data
  }, [])

  const getReviewsByProduct = (idPro) => reviewsByProduct[idPro] || []

  const getAverageRating = (idPro) => {
    const reviews = getReviewsByProduct(idPro)
    if (reviews.length === 0) return null
    return reviews.reduce((acc, r) => acc + r.calificacion, 0) / reviews.length
  }

  const hasReviewed = (idPro, idUsu) =>
    getReviewsByProduct(idPro).some((r) => r.idUsu === idUsu)

  const createReview = async ({ idPro, comentario, calificacion }) => {
    const nueva = await opinionesApi.createOpinion({ idPro, comentario, calificacion })
    setReviewsByProduct((prev) => ({ ...prev, [idPro]: [nueva, ...(prev[idPro] || [])] }))
    return nueva
  }

  const hasPurchased = (idPro) => purchasedProducts.has(Number(idPro))

  const value = { loadReviews, getReviewsByProduct, getAverageRating, hasReviewed, hasPurchased, createReview }

  return <ReviewsContext.Provider value={value}>{children}</ReviewsContext.Provider>
}

function useReviews() {
  const context = useContext(ReviewsContext)
  if (!context) {
    throw new Error('useReviews debe usarse dentro de un <ReviewsProvider>')
  }
  return context
}

export { ReviewsProvider, useReviews }
