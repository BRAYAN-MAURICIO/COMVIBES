import { Link } from 'react-router-dom'
import { CompassIcon, Home } from 'lucide-react'

function NotFound() {
  return (
    <div
      className='d-flex justify-content-center align-items-center flex-column text-center px-3'
      style={{ minHeight: '80vh' }}
    >
      <div className='not-found-icon mb-4'>
        <CompassIcon size={40} className='text-primary' />
      </div>

      <h1 className='display-1 fw-bold text-primary mb-0'>404</h1>
      <h3 className='mb-2'>Página no encontrada</h3>
      <p className='text-muted mb-4' style={{ maxWidth: '380px' }}>
        La página que buscas no existe, fue movida o la URL tiene un error.
      </p>

      <Link to='/' className='btn btn-primary d-flex align-items-center gap-2'>
        <Home size={16} /> Volver al inicio
      </Link>
    </div>
  )
}

export default NotFound
