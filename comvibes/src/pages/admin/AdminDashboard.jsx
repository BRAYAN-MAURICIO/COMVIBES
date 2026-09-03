import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  ShoppingBag, Users, Package, ClipboardList, TrendingUp,
  BarChart3, MessageSquare, Settings, ChevronRight, AlertTriangle,
} from 'lucide-react'
import { useProducts } from '../../context/ProductsContext'
import { useOrders } from '../../context/OrdersContext'
import { formatCurrency } from '../../utils/formatters'
import * as reportesApi from '../../api/reportes'

const QUICK_LINKS = [
  { to: '/admin/productos',      label: 'Gestionar Productos',  icon: ShoppingBag,   color: 'blue' },
  { to: '/admin/usuarios',       label: 'Gestionar Usuarios',   icon: Users,         color: 'purple' },
  { to: '/admin/pedidos',        label: 'Ver Pedidos',          icon: Package,       color: 'orange' },
  { to: '/admin/inventario',     label: 'Revisar Inventario',   icon: ClipboardList, color: 'teal' },
  { to: '/admin/reportes',       label: 'Ver Reportes',         icon: BarChart3,     color: 'blue' },
  { to: '/admin/soporte',        label: 'Soporte (PQR)',        icon: MessageSquare, color: 'red' },
  { to: '/admin/configuracion',  label: 'Configuración',        icon: Settings,      color: 'purple' },
]

const AVATAR_COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#ec4899']

// Un solo mapa para las tres piezas que dependen del estado (badge, barra de
// progreso y punto de la línea de tiempo). Antes eran tres funciones sueltas
// con nombres inconsistentes: 'Entregado' con mayúscula y 'en-camino' sin ella,
// así que la mitad de las clases CSS no existía.
const ESTADOS = {
  Pendiente:   { slug: 'pendiente',  icono: '⏳', etiqueta: 'En espera' },
  'En Camino': { slug: 'en-camino',  icono: '🚚', etiqueta: 'En tránsito' },
  Entregado:   { slug: 'entregado',  icono: '✅', etiqueta: 'Completado' },
  Cancelado:   { slug: 'cancelado',  icono: '❌', etiqueta: 'Cancelado' },
}
const estadoInfo = (estado) => ESTADOS[estado] || ESTADOS.Pendiente

/**
 * Fecha relativa. Igual que en utils/formatters, 'new Date("2026-08-15")' se
 * interpreta como medianoche UTC y en Colombia caía un día antes: un pedido de
 * hoy se leía como "Ayer".
 */
function relativeDate(valor) {
  if (!valor) return ''
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(String(valor)) ? `${valor}T00:00:00` : valor
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return ''

  const soloDia = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dias = Math.round((soloDia(new Date()) - soloDia(fecha)) / 86400000)

  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'Ayer'
  if (dias > 1 && dias < 7) return `Hace ${dias} días`
  return fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
}

function StatCard({ label, valor, sub, tono = 'muted', cargando }) {
  return (
    <div className='card stat-card border-0 shadow-sm h-100 hover-lift'>
      <div className='card-body p-3'>
        <p className='text-muted small mb-1'>{label}</p>
        {/* Mismo <p> en los dos estados: intercambiar el tipo de nodo entre
            carga y dato obliga a React a reemplazarlo en el DOM. */}
        <p className='dashboard-stat__valor mb-1'>
          {cargando ? <span className='placeholder col-7 d-inline-block' style={{ height: 22 }} /> : valor}
        </p>
        <p className={`mb-0 small fw-semibold text-${tono}`}>{sub}</p>
      </div>
    </div>
  )
}

function AdminDashboard() {
  const { productos } = useProducts()
  const { pedidos } = useOrders()

  // Las cifras globales vienen del backend, no se recalculan en el navegador:
  // 'productos' y 'pedidos' de los contexts pueden venir paginados, y contarlos
  // aquí daba totales distintos a los del módulo de reportes.
  const [resumen, setResumen] = useState(null)
  const [errorResumen, setErrorResumen] = useState(false)

  useEffect(() => {
    let vivo = true
    reportesApi
      .getResumen()
      .then((r) => vivo && setResumen(r))
      .catch(() => vivo && setErrorResumen(true))
    return () => { vivo = false }
  }, [])

  const cargando = !resumen && !errorResumen

  const stats = [
    {
      label: '💰 Ventas netas',
      valor: formatCurrency(resumen?.ventasTotales ?? 0),
      sub: `${resumen?.pedidosEntregados ?? 0} entregados · sin contar cancelados`,
      tono: 'success',
    },
    {
      label: '🛒 Pedidos',
      valor: resumen?.totalPedidos ?? 0,
      sub: resumen?.pedidosPendientes > 0
        ? `${resumen.pedidosPendientes} pendientes · ${resumen.pedidosEnCamino} en camino`
        : 'Sin pendientes',
      tono: resumen?.pedidosPendientes > 0 ? 'warning' : 'success',
    },
    {
      label: '📦 Productos',
      valor: resumen?.totalProductos ?? 0,
      sub: resumen?.productosAgotados > 0 ? `${resumen.productosAgotados} agotados` : 'Todos con stock',
      tono: resumen?.productosAgotados > 0 ? 'danger' : 'success',
    },
    {
      label: '👥 Usuarios',
      valor: resumen?.totalUsuarios ?? 0,
      sub: resumen?.pqrAbiertos > 0 ? `${resumen.pqrAbiertos} PQR abierto(s)` : 'Sin PQR pendientes',
      tono: resumen?.pqrAbiertos > 0 ? 'warning' : 'success',
    },
  ]

  const recientes = [...pedidos].sort((a, b) => b.idPed - a.idPed)
  const recentOrders = recientes.slice(0, 4)
  const recentActivity = recientes.slice(0, 5)

  return (
    <div className='container-fluid py-4 px-4' style={{ maxWidth: '1280px' }}>

      {/* Header */}
      <div className='mb-4'>
        <h1 className='fw-bold mb-0'>Dashboard Administrador</h1>
        <p className='text-muted mb-0'>
          {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {errorResumen && (
        <div className='alert alert-warning d-flex align-items-center gap-2 py-2 small'>
          <AlertTriangle size={16} className='flex-shrink-0' />
          No se pudieron cargar las cifras generales. Comprueba que el backend esté corriendo.
        </div>
      )}

      {/* Cifras generales — todas del backend */}
      <div className='row g-3 mb-4'>
        {stats.map((s) => (
          <div className='col-6 col-lg-3' key={s.label}>
            <StatCard {...s} cargando={cargando} />
          </div>
        ))}
      </div>

      {/* Accesos rápidos */}
      <div className='card border-0 shadow-sm mb-4 rounded-4'>
        <div className='card-body p-3'>
          <p className='fw-semibold mb-3 small text-uppercase text-muted' style={{ letterSpacing: '0.05em' }}>
            ⚡ Accesos rápidos
          </p>
          <div className='d-flex flex-wrap gap-2'>
            {QUICK_LINKS.map((link) => {
              const Icon = link.icon
              return (
                <Link key={link.to} to={link.to} className='dashboard-quick-link'>
                  <Icon size={15} /> {link.label}
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      <div className='row g-4'>

        {/* Pedidos recientes */}
        <div className='col-lg-8'>
          <div className='card border-0 shadow-sm h-100 rounded-4'>
            <div className='card-body p-4'>
              <div className='d-flex justify-content-between align-items-center mb-3'>
                <h5 className='fw-bold mb-0'>📋 Pedidos recientes</h5>
                <Link to='/admin/pedidos' className='small fw-semibold text-primary text-decoration-none'>
                  Ver todos <ChevronRight size={14} />
                </Link>
              </div>

              {recentOrders.length === 0 ? (
                <p className='text-muted text-center py-4 mb-0'>No hay pedidos aún</p>
              ) : (
                <div className='row g-3'>
                  {recentOrders.map((pedido, i) => {
                    const info = estadoInfo(pedido.estado)
                    return (
                      <div className='col-sm-6' key={pedido.idPed}>
                        <div className='order-card-2'>
                          <div className='d-flex justify-content-between align-items-start mb-2'>
                            <span className='fw-bold small'>#{pedido.idPed}</span>
                            {/* Un solo badge por tarjeta: antes se repetía arriba
                                y abajo diciendo lo mismo con otras palabras. */}
                            <span className={`status-badge status-badge--${info.slug}`}>
                              {info.icono} {pedido.estado}
                            </span>
                          </div>

                          <div className='d-flex align-items-center gap-2 mb-2'>
                            <div
                              className='dashboard-avatar'
                              style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                              aria-hidden='true'
                            >
                              {(pedido.cliente || 'C').charAt(0).toUpperCase()}
                            </div>
                            <div className='min-w-0'>
                              <p className='mb-0 small fw-semibold text-truncate'>{pedido.cliente || 'Cliente'}</p>
                              <p className='mb-0 text-muted' style={{ fontSize: '0.75rem' }}>
                                {relativeDate(pedido.fecha_pedido)}
                              </p>
                            </div>
                          </div>

                          <div className='d-flex justify-content-between align-items-center pt-2 dashboard-divider'>
                            <span className='fw-bold' style={{ fontSize: '1.05rem' }}>
                              {formatCurrency(pedido.total)}
                            </span>
                            <span className='small text-muted'>{info.etiqueta}</span>
                          </div>

                          <div className='order-card-2__progress'>
                            <div className={`order-card-2__progress-bar order-card-2__progress-bar--${info.slug}`} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {recentActivity.length > 0 && (
                <div className='mt-4 pt-3 dashboard-divider'>
                  <p className='small fw-semibold text-muted mb-2'>🔄 Actividad reciente</p>
                  <div className='activity-timeline'>
                    {recentActivity.map((p) => (
                      <div className='activity-timeline__item' key={p.idPed}>
                        <div className={`activity-timeline__dot activity-timeline__dot--${estadoInfo(p.estado).slug}`} />
                        <p className='mb-0 flex-grow-1 small text-muted'>
                          Pedido #{p.idPed} de {p.cliente || 'Cliente'} — <strong>{p.estado}</strong>
                        </p>
                        <p className='mb-0 small text-muted text-nowrap'>{relativeDate(p.fecha_pedido)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Productos */}
        <div className='col-lg-4'>
          <div className='card border-0 shadow-sm h-100 rounded-4'>
            <div className='card-body p-4'>
              <div className='d-flex justify-content-between align-items-center mb-3'>
                <h5 className='fw-bold mb-0'>📦 Productos</h5>
                <Link to='/admin/productos' className='small fw-semibold text-primary text-decoration-none'>
                  Ver todos <ChevronRight size={14} />
                </Link>
              </div>

              <div className='d-flex flex-column gap-2'>
                {productos.slice(0, 6).map((p) => {
                  const agotado = p.stock === 0
                  const bajo = !agotado && p.stock < 10
                  return (
                    <div key={p.idPro} className='dashboard-producto'>
                      <div className='min-w-0'>
                        <p className='mb-0 small fw-semibold text-truncate'>{p.nombre}</p>
                        <p className='mb-0 text-muted' style={{ fontSize: '0.75rem' }}>
                          {p.categoria || 'Sin categoría'}
                        </p>
                      </div>
                      <span className={`small fw-bold text-nowrap text-${agotado ? 'danger' : bajo ? 'warning' : 'success'}`}>
                        {agotado ? 'Agotado' : `${p.stock} und`}
                      </span>
                    </div>
                  )
                })}
                {productos.length === 0 && <p className='text-muted text-center py-3 small mb-0'>Sin productos</p>}
              </div>

              {/* Resumen del catálogo. Los totales son los del backend: contar
                  'productos' aquí daba solo la página cargada del catálogo, y
                  contradecía la tarjeta de arriba. */}
              <div className='mt-3 pt-3 dashboard-divider'>
                {[
                  ['Total productos', resumen?.totalProductos ?? '—', ''],
                  ['Con stock', resumen ? resumen.totalProductos - resumen.productosAgotados : '—', 'text-success'],
                  ['Agotados', resumen?.productosAgotados ?? '—', 'text-danger'],
                ].map(([label, val, clase]) => (
                  <div key={label} className='d-flex justify-content-between small mb-1'>
                    <span className='text-muted'>{label}</span>
                    <span className={`fw-bold ${clase}`}>{val}</span>
                  </div>
                ))}
              </div>

              <Link
                to='/admin/reportes'
                className='btn btn-outline-primary btn-sm w-100 mt-3 d-flex align-items-center justify-content-center gap-2'
              >
                <TrendingUp size={15} /> Ver reporte completo
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default AdminDashboard
