import { Suspense } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

// Envuelve el <Outlet /> y usa la ruta como key: cada vez que cambia,
// React desmonta/monta el div y la animación CSS se vuelve a disparar,
// dando una transición suave de entrada entre páginas.
//
// Las páginas se cargan bajo demanda (React.lazy en AppRoutes.jsx). El
// Suspense va aquí, dentro del layout, para que mientras llega el código de
// una página se sigan viendo el navbar/sidebar y solo el contenido muestre
// el indicador de carga.
function CargandoPagina() {
  return (
    <div className='d-flex justify-content-center py-5' role='status' aria-live='polite'>
      <div className='spinner-border text-primary' aria-hidden='true' />
      <span className='visually-hidden'>Cargando página…</span>
    </div>
  )
}

function PageTransition() {
  const location = useLocation()

  return (
    <div key={location.pathname} className='page-transition'>
      <Suspense fallback={<CargandoPagina />}>
        <Outlet />
      </Suspense>
    </div>
  )
}

export default PageTransition
