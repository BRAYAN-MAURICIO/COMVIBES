import { Outlet, useLocation } from 'react-router-dom'

// Envuelve el <Outlet /> y usa la ruta como key: cada vez que cambia,
// React desmonta/monta el div y la animación CSS se vuelve a disparar,
// dando una transición suave de entrada entre páginas.
function PageTransition() {
  const location = useLocation()

  return (
    <div key={location.pathname} className='page-transition'>
      <Outlet />
    </div>
  )
}

export default PageTransition
