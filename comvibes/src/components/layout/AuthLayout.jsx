// Layout compartido por Login y Register: panel de marca a la izquierda
// (oculto en móvil) + panel de formulario a la derecha. Reemplaza la
// tarjeta centrada genérica que ambas páginas repetían.
function AuthLayout({ title, subtitle, children }) {
  return (
    <div className='auth-shell'>
      <div className='auth-brand d-none d-lg-flex'>
        <div>
          <span className='auth-brand__badge'>COMVIBES</span>
          <h2 className='fw-bold text-white mt-4 mb-3'>
            Bolsos y accesorios con estilo propio
          </h2>
          <p className='text-white-50 mb-0'>
            Regístrate o inicia sesión para guardar tus favoritos, seguir
            tus pedidos y comprar más rápido la próxima vez.
          </p>
        </div>
      </div>

      <div className='auth-form-panel'>
        <div className='auth-form-panel__inner'>
          <h2 className='fw-bold mb-1'>{title}</h2>
          {subtitle && <p className='text-muted mb-4'>{subtitle}</p>}
          {children}
        </div>
      </div>
    </div>
  )
}

export default AuthLayout
