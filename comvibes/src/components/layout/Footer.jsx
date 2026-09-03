import { Link } from 'react-router-dom'
import { Share2, Mail, Phone, Clock, MessageCircle, Play, Camera } from 'lucide-react'

const SOCIAL = [
  { Icon: Camera,        href: 'https://instagram.com/comvibes', label: 'Instagram' },
  { Icon: MessageCircle, href: 'https://twitter.com/comvibes',   label: 'Twitter'   },
  { Icon: Play,          href: 'https://youtube.com/@comvibes',  label: 'YouTube'   },
]

function Footer() {
  return (
    <footer className='site-footer'>
      <div className='container'>
        <div className='row g-5'>

          {/* ── Marca ── */}
          <div className='col-md-4'>
            <span className='site-footer__brand'>COMVIBES</span>
            <p className='site-footer__tagline'>
              Bolsos, accesorios y productos exclusivos del occidente huilense.
              Hecho con orgullo en Colombia 🇨🇴
            </p>
            <div className='site-footer__social'>
              {SOCIAL.map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='site-footer__social-btn'
                  aria-label={label}
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* ── Navegación ── */}
          <div className='col-6 col-md-2'>
            <h6 className='site-footer__heading'>Explorar</h6>
            <ul className='list-unstyled site-footer__links'>
              <li><Link to='/catalogo'>Catálogo</Link></li>
              <li><Link to='/categorias'>Categorías</Link></li>
              <li><Link to='/favoritos'>Favoritos</Link></li>
              <li><Link to='/soporte'>Soporte</Link></li>
            </ul>
          </div>

          {/* ── Mi cuenta ── */}
          <div className='col-6 col-md-2'>
            <h6 className='site-footer__heading'>Mi cuenta</h6>
            <ul className='list-unstyled site-footer__links'>
              <li><Link to='/perfil'>Perfil</Link></li>
              <li><Link to='/pedidos'>Mis pedidos</Link></li>
              <li><Link to='/carrito'>Carrito</Link></li>
              <li><Link to='/login'>Iniciar sesión</Link></li>
            </ul>
          </div>

          {/* ── Contacto ── */}
          <div className='col-md-4'>
            <h6 className='site-footer__heading'>Contacto</h6>
            <ul className='list-unstyled site-footer__contact'>
              <li>
                <Mail size={14} />
                <a href='mailto:soporte@comvibes.com'>soporte@comvibes.com</a>
              </li>
              <li>
                <Phone size={14} />
                <a href='https://wa.me/573001234567' target='_blank' rel='noopener noreferrer'>
                  +57 300 123 4567
                </a>
              </li>
              <li>
                <Clock size={14} />
                <span>Lun – Sáb, 8:00 AM – 6:00 PM</span>
              </li>
            </ul>
          </div>
        </div>

        <div className='site-footer__divider' />

        <div className='site-footer__bottom'>
          <p>© 2026 COMVIBES — Todos los derechos reservados</p>
          <div className='site-footer__legal'>
            <Link to='/soporte'>Términos y condiciones</Link>
            <Link to='/soporte'>Política de privacidad</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
