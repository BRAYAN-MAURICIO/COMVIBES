import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ShoppingBag, Users, Package, ClipboardList,
  BarChart3, MessageSquare, Settings, Menu, LogOut, Truck, X, Home,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useOrders } from '../../context/OrdersContext'
import { useSupport } from '../../context/SupportContext'

const LINKS = [
  { to: '/admin',              label: 'Dashboard',       icon: LayoutDashboard, end: true },
  { to: '/admin/productos',    label: 'Productos',       icon: ShoppingBag },
  { to: '/admin/usuarios',     label: 'Usuarios',        icon: Users },
  { to: '/admin/pedidos',      label: 'Pedidos',         icon: Package,       badge: 'pedidos' },
  { to: '/admin/inventario',   label: 'Inventario',      icon: ClipboardList },
  { to: '/admin/proveedores',  label: 'Proveedores',     icon: Truck },
  { to: '/admin/reportes',     label: 'Reportes',        icon: BarChart3 },
  { to: '/admin/soporte',      label: 'Soporte (PQR)',   icon: MessageSquare, badge: 'soporte' },
  { to: '/admin/configuracion',label: 'Configuración',   icon: Settings },
]

function SidebarAdmin() {
  const [open, setOpen] = useState(false)
  const location  = useLocation()
  const { user, logout } = useAuth()
  const navigate  = useNavigate()
  const { pedidos } = useOrders()
  const { tickets } = useSupport()

  const pendingOrders  = pedidos.filter(p => p.estado === 'Pendiente').length
  const openTickets    = tickets.filter(t => t.estado !== 'Cerrado').length

  const getBadge = (key) => {
    if (key === 'pedidos')  return pendingOrders  > 0 ? pendingOrders  : 0
    if (key === 'soporte')  return openTickets    > 0 ? openTickets    : 0
    return 0
  }

  const isActive = (link) =>
    link.end ? location.pathname === link.to : location.pathname.startsWith(link.to)

  const handleLogout = () => { logout(); navigate('/') }
  const close = () => setOpen(false)

  return (
    <>
      {/* Mobile toggle */}
      <button
        className='btn btn-dark d-lg-none m-2 d-flex align-items-center gap-2'
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-controls='admin-sidebar'
      >
        {open ? <X size={18} /> : <Menu size={18} />} Menú admin
      </button>

      {/* Overlay mobile */}
      {open && (
        <div
          className='d-lg-none'
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:199 }}
          onClick={close}
        />
      )}

      <aside id='admin-sidebar' className={`sidebar-admin ${open ? 'sidebar-admin--open' : ''}`}
        style={{ zIndex: 200 }}>

        {/* Brand */}
        <div className='sidebar-admin__brand'>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '0.9rem', flexShrink: 0,
          }}>CV</div>
          <div>
            <div className='fw-bold' style={{ letterSpacing: '0.05em' }}>COMVIBES</div>
            <small style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>Panel Admin</small>
          </div>
        </div>

        {/* Volver al sitio público */}
        <Link
          to='/'
          onClick={close}
          className='sidebar-admin__link'
          style={{ margin: '0.5rem 0.75rem 0.75rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)' }}
        >
          <Home size={17} className='sidebar-admin__icon' />
          <span style={{ flex: 1 }}>Volver a la tienda</span>
        </Link>

        {/* Nav */}
        <nav>
          <ul className='list-unstyled sidebar-admin__nav'>
            {LINKS.map((link) => {
              const Icon    = link.icon
              const active  = isActive(link)
              const count   = link.badge ? getBadge(link.badge) : 0

              return (
                <li key={link.to}>
                  <Link
                    className={`sidebar-admin__link ${active ? 'sidebar-admin__link--active' : ''}`}
                    to={link.to}
                    onClick={close}
                    style={active ? {
                      background: 'linear-gradient(90deg, rgba(59,130,246,0.25), rgba(139,92,246,0.15))',
                      borderLeft: '3px solid #3b82f6',
                      color: '#fff',
                    } : {}}
                  >
                    <Icon size={17} className='sidebar-admin__icon' />
                    <span style={{ flex: 1 }}>{link.label}</span>
                    {count > 0 && (
                      <span style={{
                        background: '#ef4444', color: '#fff',
                        borderRadius: '9999px', fontSize: '0.68rem',
                        fontWeight: 700, padding: '0.1rem 0.5rem',
                        minWidth: '1.3rem', textAlign: 'center',
                      }}>
                        {count}
                      </span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Footer con usuario */}
        <div className='sidebar-admin__footer'>
          <div className='sidebar-admin__user'>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '0.85rem', color: '#fff', flexShrink: 0,
            }}>
              {user?.nombre?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className='text-truncate'>
              <div className='small fw-semibold text-truncate'>{user?.nombre} {user?.apellido}</div>
              <small style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }} className='text-truncate d-block'>
                {user?.correo}
              </small>
            </div>
          </div>
          <button
            className='btn btn-sm w-100 mt-3 d-flex align-items-center justify-content-center gap-2'
            style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
            onClick={handleLogout}
          >
            <LogOut size={15} /> Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  )
}

export default SidebarAdmin
