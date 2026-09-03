import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Package, ChevronDown, ChevronUp, FileText, Truck, Clock, CheckCircle, XCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useEnvios } from '../context/EnviosContext'
import { getPedidos } from '../api/pedidos'
import Breadcrumbs from '../components/ui/Breadcrumbs'
import Pagination from '../components/ui/Pagination'
import { formatCurrency, formatDate } from '../utils/formatters'

const PAGE_SIZE = 10

/* ── Configuración de pasos del stepper ── */
const STEPS = [
  {
    key: 'Pendiente',
    label: 'Pedido recibido',
    Icon: Clock,
  },
  {
    key: 'En Camino',
    label: 'En camino',
    Icon: Truck,
  },
  {
    key: 'Entregado',
    label: 'Entregado',
    Icon: CheckCircle,
  },
]

const STEP_INDEX = { Pendiente: 0, 'En Camino': 1, Entregado: 2 }

/* ── Stepper component ── */
function OrderStepper({ order, envio }) {
  const cancelled = order.estado === 'Cancelado'
  const activeIdx = cancelled ? 0 : (STEP_INDEX[order.estado] ?? 0)

  if (cancelled) {
    return (
      <div className='order-stepper order-stepper--cancelled'>
        <div className='order-stepper__cancelled-badge'>
          <XCircle size={18} />
          <span>Pedido cancelado</span>
        </div>
        <p className='order-stepper__cancelled-sub'>
          Este pedido fue cancelado el {formatDate(order.fecha_pedido)}.
        </p>
      </div>
    )
  }

  return (
    <div className='order-stepper'>
      {STEPS.map(({ key, label, Icon }, i) => {
        const done = i < activeIdx
        const active = i === activeIdx

        /* Sub-etiqueta dinámica según el paso */
        let sub = null
        if (i === 0) sub = formatDate(order.fecha_pedido)
        if (i === 1 && envio?.transportadora) sub = envio.transportadora
        if (i === 1 && envio?.numero_guia) sub = `${envio.transportadora ?? ''} · Guía ${envio.numero_guia}`
        if (i === 2 && envio?.fecha_estimada) sub = `Est. ${formatDate(envio.fecha_estimada)}`
        if (i === 2 && done) sub = 'Completado'

        return (
          <div key={key} className='order-stepper__item'>
            {/* Línea izquierda */}
            {i > 0 && (
              <div className={`order-stepper__connector${done || active ? ' order-stepper__connector--filled' : ''}`} />
            )}

            {/* Círculo con icono */}
            <div
              className={`order-stepper__bubble${
                done ? ' order-stepper__bubble--done' :
                active ? ' order-stepper__bubble--active' : ''
              }`}
            >
              <Icon size={15} strokeWidth={done || active ? 2.5 : 1.8} />
            </div>

            {/* Texto */}
            <div className='order-stepper__text'>
              <span className={`order-stepper__label${active ? ' order-stepper__label--active' : done ? ' order-stepper__label--done' : ''}`}>
                {label}
              </span>
              {sub && <span className='order-stepper__sub'>{sub}</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Página principal ── */
function OrderHistory() {
  const { user } = useAuth()
  const { getByOrder } = useEnvios()
  const [expandedId, setExpandedId] = useState(null)

  // Paginación local — carga pedidos por página desde el backend
  const [pedidos, setPedidos]       = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal]           = useState(0)
  const [loading, setLoading]       = useState(true)

  const fetchPedidos = useCallback(async (page) => {
    setLoading(true)
    try {
      const res = await getPedidos({ page, limit: PAGE_SIZE })
      // El backend devuelve { pedidos, total, page, totalPages } cuando se pagina
      if (res && res.pedidos) {
        setPedidos(res.pedidos)
        setTotal(res.total)
        setTotalPages(res.totalPages)
        setCurrentPage(res.page)
      } else {
        // Fallback: respuesta sin paginación (array plano)
        setPedidos(Array.isArray(res) ? res : [])
      }
    } catch {
      setPedidos([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPedidos(1)
  }, [fetchPedidos])

  const handlePageChange = (page) => {
    setCurrentPage(page)
    fetchPedidos(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) {
    return (
      <div className='container py-5 text-center'>
        <Breadcrumbs items={[{ label: 'Mis pedidos' }]} />
        <div className='spinner-border text-primary mt-5' role='status'>
          <span className='visually-hidden'>Cargando...</span>
        </div>
      </div>
    )
  }

  if (!loading && pedidos.length === 0) {
    return (
      <div className='container py-5 text-center'>
        <Breadcrumbs items={[{ label: 'Mis pedidos' }]} />
        <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-4" aria-hidden="true">
          <rect x="20" y="10" width="80" height="80" rx="10" fill="#f1f5f9"/>
          <rect x="30" y="25" width="60" height="8" rx="4" fill="#e2e8f0"/>
          <rect x="30" y="40" width="45" height="6" rx="3" fill="#e2e8f0"/>
          <rect x="30" y="53" width="50" height="6" rx="3" fill="#e2e8f0"/>
          <rect x="30" y="66" width="35" height="6" rx="3" fill="#e2e8f0"/>
          <circle cx="90" cy="75" r="18" fill="#3b82f6"/>
          <path d="M82 75 L88 81 L98 69" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <h1 className='fw-bold text-primary mb-3'>Historial de Pedidos</h1>
        <p className='text-muted'>Todavía no has realizado ningún pedido.</p>
        <Link to='/catalogo' className='btn btn-primary mt-2'>
          Ir al catálogo
        </Link>
      </div>
    )
  }

  return (
    <div className='container py-5'>
      <Breadcrumbs items={[{ label: 'Mis pedidos' }]} />

      <h1 className='fw-bold text-primary mb-1'>Historial de Pedidos</h1>
      <p className='text-muted mb-5'>{pedidos.length} pedido(s) realizados</p>

      <div className='d-flex flex-column gap-3'>
        {pedidos.map((order) => {
          const isExpanded = expandedId === order.idPed
          const envio = getByOrder(order.idPed)

          return (
            <div key={order.idPed} className='card border-0 shadow-sm rounded-4'>
              <button
                type='button'
                className='order-row'
                onClick={() => setExpandedId(isExpanded ? null : order.idPed)}
                aria-expanded={isExpanded}
              >
                <div className='order-row__icon'>
                  <Package size={20} />
                </div>

                <div className='order-row__info'>
                  <div className='fw-bold'>Pedido #{order.idPed}</div>
                  <small className='text-muted'>{formatDate(order.fecha_pedido)}</small>
                </div>

                <span className={`status-badge status-badge--${
                  order.estado === 'En Camino' ? 'en-camino' :
                  order.estado === 'Entregado' ? 'entregado' :
                  order.estado === 'Cancelado' ? 'cancelado' : 'pendiente'
                }`}>
                  {{ Pendiente: '⏳', 'En Camino': '🚚', Entregado: '✅', Cancelado: '❌' }[order.estado]} {order.estado}
                </span>

                <div className='order-row__total fw-bold text-primary'>
                  {formatCurrency(order.total)}
                </div>

                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>

              {isExpanded && (
                <div className='px-4 pb-4'>
                  <hr className='mt-0' />

                  {/* ── Stepper mejorado ── */}
                  <OrderStepper order={order} envio={envio} />

                  {/* ── Detalle de productos ── */}
                  <ul className='list-unstyled mb-3 d-flex flex-column gap-2'>
                    {order.detalle.map((item) => (
                      <li key={item.idPro} className='d-flex justify-content-between small'>
                        <span>{item.cantidad} × {item.nombre}</span>
                        <span className='text-muted'>{formatCurrency(item.precio_unitario * item.cantidad)}</span>
                      </li>
                    ))}
                  </ul>

                  {/* ── Info de envío (guía/transportadora) ── */}
                  {envio && (
                    <div className='small text-muted mb-3 d-flex align-items-start gap-2'>
                      <Truck size={16} className='text-primary flex-shrink-0 mt-1' />
                      <div>
                        <span className='fw-semibold text-body'>{envio.transportadora}</span>
                        {envio.numero_guia && <> — Guía: {envio.numero_guia}</>}
                        {envio.fecha_estimada && (
                          <div>Entrega estimada: {formatDate(envio.fecha_estimada)}</div>
                        )}
                      </div>
                    </div>
                  )}

                  <Link
                    to={`/factura/${order.idPed}`}
                    className='btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-2'
                  >
                    <FileText size={14} /> Ver factura
                  </Link>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {totalPages > 1 && (
        <div className='d-flex flex-column align-items-center mt-4 gap-1'>
          <p className='text-muted small mb-1'>
            Página {currentPage} de {totalPages} — {total} pedido{total !== 1 ? 's' : ''}
          </p>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  )
}

export default OrderHistory
