import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// requiredRole: si se omite, solo exige sesión activa (cualquier rol).
// Si se pasa 'admin', exige además que el rol del usuario sea admin.
function ProtectedRoute({ children, requiredRole }) {
  const { isAuthenticated, isAdmin, loading } = useAuth()
  const location = useLocation()

  if (loading) return null // evita parpadeo mientras se lee localStorage

  if (!isAuthenticated) {
    // Guarda la ruta de origen para poder volver aquí tras iniciar sesión
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (requiredRole === 'admin' && !isAdmin) {
    return <Navigate to="/" replace />
  }

  return children
}

export default ProtectedRoute
