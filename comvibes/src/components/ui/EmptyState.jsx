/**
 * EmptyState — componente reutilizable para estados vacíos ilustrados
 * 
 * Props:
 *   variant: 'catalog' | 'wishlist' | 'orders' | 'cart' | 'support' | 'generic'
 *   title: string
 *   description: string
 *   action: { label: string, to?: string, onClick?: fn }  (opcional)
 */
import { Link } from 'react-router-dom'

const ILLUSTRATIONS = {
  catalog: (
    <svg width="140" height="120" viewBox="0 0 140 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Lupa */}
      <circle cx="58" cy="55" r="30" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="3"/>
      <circle cx="58" cy="55" r="20" fill="#dbeafe"/>
      {/* Cruz interna */}
      <path d="M51 55h14M58 48v14" stroke="#93c5fd" strokeWidth="2.5" strokeLinecap="round"/>
      {/* Mango */}
      <path d="M80 77 L100 97" stroke="#bfdbfe" strokeWidth="6" strokeLinecap="round"/>
      {/* Estrella decorativa */}
      <circle cx="105" cy="28" r="5" fill="#fde68a"/>
      <circle cx="25" cy="35" r="3.5" fill="#fca5a5"/>
      <circle cx="118" cy="70" r="4" fill="#a5f3fc"/>
    </svg>
  ),
  wishlist: (
    <svg width="140" height="120" viewBox="0 0 140 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Corazón vacío punteado */}
      <path d="M70 92 C70 92 28 62 28 38 C28 24 38 14 52 18 C61 21 67 30 70 38 C73 30 79 21 88 18 C102 14 112 24 112 38 C112 62 70 92 70 92Z"
        fill="#fce7f3" stroke="#f9a8d4" strokeWidth="2" strokeDasharray="5 3"/>
      {/* Signo + en el centro */}
      <path d="M62 38h16M70 30v16" stroke="#f472b6" strokeWidth="2.5" strokeLinecap="round"/>
      {/* Corazón pequeño flotante */}
      <path d="M100 25 C100 25 93 20 93 15 C93 12 95 10 97.5 11 C99 11.5 100 13 100 13 C100 13 101 11.5 102.5 11 C105 10 107 12 107 15 C107 20 100 25 100 25Z"
        fill="#fda4af"/>
      <circle cx="30" cy="70" r="4" fill="#fde68a"/>
      <circle cx="115" cy="45" r="3" fill="#a5f3fc"/>
    </svg>
  ),
  orders: (
    <svg width="140" height="120" viewBox="0 0 140 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Caja */}
      <rect x="30" y="35" width="80" height="65" rx="8" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="2"/>
      {/* Tapa */}
      <path d="M30 55 L110 55" stroke="#bfdbfe" strokeWidth="2"/>
      <path d="M55 35 L55 55" stroke="#bfdbfe" strokeWidth="2"/>
      <path d="M85 35 L85 55" stroke="#bfdbfe" strokeWidth="2"/>
      {/* Lazo */}
      <path d="M55 45 Q70 50 85 45" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round"/>
      {/* Líneas de contenido */}
      <rect x="44" y="67" width="52" height="5" rx="2.5" fill="#dbeafe"/>
      <rect x="44" y="78" width="38" height="5" rx="2.5" fill="#dbeafe"/>
      {/* Tilde de aprobado */}
      <circle cx="105" cy="30" r="12" fill="#d1fae5"/>
      <path d="M99 30 L103 34 L111 24" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  cart: (
    <svg width="140" height="120" viewBox="0 0 140 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="15" y="25" width="110" height="70" rx="10" fill="#f1f5f9"/>
      <path d="M35 25 Q35 13 48 13 L92 13 Q105 13 105 25" stroke="#cbd5e1" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <circle cx="52" cy="84" r="8" fill="#e2e8f0"/>
      <circle cx="88" cy="84" r="8" fill="#e2e8f0"/>
      <path d="M44 52 L96 52" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round"/>
      <path d="M44 64 L78 64" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round"/>
      <circle cx="108" cy="20" r="11" fill="#3b82f6"/>
      <path d="M103 20 L107 24 L114 14" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  support: (
    <svg width="140" height="120" viewBox="0 0 140 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Burbuja de chat */}
      <rect x="20" y="20" width="90" height="60" rx="14" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="2"/>
      <path d="M35 80 L25 98 L55 80Z" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="2" strokeLinejoin="round"/>
      {/* Puntos de ellipsis */}
      <circle cx="50" cy="50" r="5" fill="#93c5fd"/>
      <circle cx="65" cy="50" r="5" fill="#60a5fa"/>
      <circle cx="80" cy="50" r="5" fill="#3b82f6"/>
      {/* Segundo globo pequeño */}
      <rect x="80" y="55" width="45" height="30" rx="10" fill="#dbeafe"/>
      <path d="M110 85 L118 96 L95 85Z" fill="#dbeafe"/>
      <rect x="88" y="64" width="28" height="4" rx="2" fill="#93c5fd"/>
      <rect x="88" y="73" width="20" height="4" rx="2" fill="#bfdbfe"/>
    </svg>
  ),
  generic: (
    <svg width="140" height="120" viewBox="0 0 140 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="30" y="20" width="80" height="80" rx="12" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2"/>
      <rect x="44" y="38" width="52" height="7" rx="3.5" fill="#e2e8f0"/>
      <rect x="44" y="52" width="38" height="6" rx="3" fill="#e2e8f0"/>
      <rect x="44" y="65" width="44" height="6" rx="3" fill="#e2e8f0"/>
      <rect x="44" y="78" width="28" height="6" rx="3" fill="#f1f5f9"/>
      <circle cx="105" cy="30" r="14" fill="#fde68a"/>
      <path d="M105 23 L105 31 M105 35 L105 36" stroke="#92400e" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
}

function EmptyState({ variant = 'generic', title, description, action }) {
  return (
    <div className='empty-state'>
      <div className='empty-state__illustration'>
        {ILLUSTRATIONS[variant] ?? ILLUSTRATIONS.generic}
      </div>
      {title && <h3 className='empty-state__title'>{title}</h3>}
      {description && <p className='empty-state__desc'>{description}</p>}
      {action && (
        action.to
          ? <Link to={action.to} className='btn btn-primary mt-2'>{action.label}</Link>
          : <button className='btn btn-primary mt-2' onClick={action.onClick}>{action.label}</button>
      )}
    </div>
  )
}

export default EmptyState
