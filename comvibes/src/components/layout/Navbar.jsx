import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { ShoppingCart as CartIcon, ChevronDown, User, Heart, Package, LogOut, Sun, Moon } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { useTheme } from '../../context/ThemeContext'
import NavbarSearch from './NavbarSearch'
import NotificationsBell from './NotificationsBell'

function Navbar() {
  const [open, setOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef(null)

  const { isAuthenticated, isAdmin, user, logout } = useAuth()
  const { itemCount } = useCart()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path, exact = false) =>
  exact ? location.pathname === path : location.pathname.startsWith(path)

  const closeMenu = () => setOpen(false)

  const handleLogout = () => {
    logout()
    setAccountOpen(false)
    closeMenu()
    navigate('/')
  }

  // Cierra el menú de cuenta al hacer clic fuera de él
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (accountRef.current && !accountRef.current.contains(e.target)) {
        setAccountOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <nav className='navbar navbar-expand-lg navbar-dark bg-primary px-4'>
      <div className='container-fluid'>
        <Link className='navbar-brand fw-bold' to='/' onClick={closeMenu}>
          COMVIBES
        </Link>

        {/* Toggle propio en useState: no depende del bundle JS de Bootstrap */}
        <button
          className='navbar-toggler'
          type='button'
          aria-label='Abrir menú de navegación'
          aria-controls='main-nav-menu'
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
        >
          <span className='navbar-toggler-icon'></span>
        </button>

        <div id='main-nav-menu' className={`collapse navbar-collapse ${open ? 'show' : ''}`}>
          <div className='navbar-search-wrap'>
            <NavbarSearch onNavigate={closeMenu} />
          </div>

          <ul className='navbar-nav ms-auto align-items-lg-center gap-lg-2'>
            <li className='nav-item'>
              <Link className={`nav-link${isActive('/', true) ? ' nav-link--active' : ''}`} to='/' onClick={closeMenu}>Inicio</Link>
            </li>
            <li className='nav-item'>
              <Link className={`nav-link${isActive('/catalogo', false) ? ' nav-link--active' : ''}`} to='/catalogo' onClick={closeMenu}>Catálogo</Link>
            </li>
            <li className='nav-item'>
              <Link className={`nav-link${isActive('/categorias', false) ? ' nav-link--active' : ''}`} to='/categorias' onClick={closeMenu}>Categorías</Link>
            </li>
            <li className='nav-item'>
              <Link className={`nav-link${isActive('/soporte', false) ? ' nav-link--active' : ''}`} to='/soporte' onClick={closeMenu}>Soporte</Link>
            </li>

            {isAdmin && (
              <li className='nav-item'>
                <Link className='nav-link fw-semibold' to='/admin' onClick={closeMenu}>
                  Panel Admin
                </Link>
              </li>
            )}

            <li className='nav-item'>
              <button
                type='button'
                className='btn btn-outline-light btn-sm d-flex align-items-center justify-content-center'
                style={{ width: '34px', height: '34px' }}
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </li>

            {isAuthenticated && (
              <li className='nav-item'>
                <NotificationsBell />
              </li>
            )}

            <li className='nav-item'>
              <Link className='nav-link position-relative d-flex align-items-center gap-1' to='/carrito' onClick={closeMenu}>
                <CartIcon size={18} /> Carrito
                {itemCount > 0 && (
                  <span className='badge bg-danger rounded-pill ms-1'>{itemCount}</span>
                )}
              </Link>
            </li>

            {isAuthenticated ? (
              <li className='nav-item account-menu' ref={accountRef}>
                <button
                  type='button'
                  className='btn btn-outline-light btn-sm ms-lg-2 d-flex align-items-center gap-1'
                  onClick={() => setAccountOpen((prev) => !prev)}
                  aria-expanded={accountOpen}
                  aria-haspopup='true'
                >
                  <User size={16} /> {user.nombre}
                  <ChevronDown size={14} />
                </button>

                {accountOpen && (
                  <div className='account-menu__dropdown'>
                    <Link
                      to='/perfil'
                      className='account-menu__item'
                      onClick={() => { setAccountOpen(false); closeMenu() }}
                    >
                      <User size={16} /> Mi perfil
                    </Link>
                    <Link
                      to='/pedidos'
                      className='account-menu__item'
                      onClick={() => { setAccountOpen(false); closeMenu() }}
                    >
                      <Package size={16} /> Mis pedidos
                    </Link>
                    <Link
                      to='/favoritos'
                      className='account-menu__item'
                      onClick={() => { setAccountOpen(false); closeMenu() }}
                    >
                      <Heart size={16} /> Favoritos
                    </Link>
                    <button type='button' className='account-menu__item account-menu__item--danger' onClick={handleLogout}>
                      <LogOut size={16} /> Cerrar sesión
                    </button>
                  </div>
                )}
              </li>
            ) : (
              <li className='nav-item'>
                <Link className='btn btn-light btn-sm ms-lg-2' to='/login' onClick={closeMenu}>
                  Iniciar sesión
                </Link>
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
