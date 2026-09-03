import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import * as opinionesApi from '../api/opiniones'
import { getPedidos } from '../api/pedidos'
import { useAuth } from './AuthContext'

const ReviewsContext = createContext(null)

// A diferencia del resto, las reseñas NO se precargan todas al montar la
// app (no hay un endpoint "todas las opiniones", y no haría falta: se
// cargan por producto, bajo demanda, desde ProductDetail).
function ReviewsProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [reviewsByProduct, setReviewsByProduct] = useState({}) // { [idPro]: Review[] }
  // Set de idPro que el usuario ha comprado (Entregado o En Camino)
  // Se usa para mostrar/ocultar el formulario de reseña sin esperar al backend.
  const [purchasedProducts, setPurchasedProducts] = useState(new Set())

  // Al cerrar sesión limpiamos el caché para que el siguiente usuario
  // no vea reseñas cargadas de la sesión anterior.
  useEffect(() => {
    if (!isAuthenticated) {
      setReviewsByProduct({})
      setPurchasedProducts(new Set())
      return
    }
    // Cargar qué productos ha comprado este usuario para habilitar el formulario de reseña
    getPedidos()
      .then((pedidos) => {
        const ids = new Set()
        ;(Array.isArray(pedidos) ? pedidos : []).forEach((p) => {
          if (p.estado === 'Entregado' || p.estado === 'En Camino') {
            ;(p.detalle || []).forEach((d) => ids.add(d.idPro))
          }
        })
        setPurchasedProducts(ids)
      })
      .catch(() => {})
  }, [isAuthenticated])

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
