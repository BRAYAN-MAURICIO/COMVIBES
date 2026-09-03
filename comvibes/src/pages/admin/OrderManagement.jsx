import { useState, useMemo, Fragment } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../../context/ToastContext'
import { Search, ChevronDown, ChevronUp, PackageSearch, FileText, Truck } from 'lucide-react'
import { useOrders } from '../../context/OrdersContext'
import { useEnvios } from '../../context/EnviosContext'
import { formatCurrency, formatDate } from '../../utils/formatters'

// Mismos valores del ENUM de la tabla `pedidos` en comvibes_db
const ESTADOS = ['Pendiente', 'En Camino', 'Entregado', 'Cancelado']

function OrderManagement() {
  const toast = useToast()
  const { pedidos, updateOrderStatus } = useOrders()
  const { getByOrder, upsertShipment } = useEnvios()
  const [expandedId, setExpandedId] = useState(null)
  const [search, setSearch] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('')
  const [draftEnvio, setDraftEnvio] = useState({ transportadora: '', numero_guia: '', fecha_estimada: '' })

  const toggleExpand = (idPed) => {
    if (expandedId === idPed) {
      setExpandedId(null)
      return
    }
    setExpandedId(idPed)
    const envio = getByOrder(idPed)
    setDraftEnvio({
      transportadora: envio?.transportadora || '',
      numero_guia: envio?.numero_guia || '',
      fecha_estimada: envio?.fecha_estimada || '',
    })
  }

  const handleSaveEnvio = async (idPed) => {
    try {
      await upsertShipment(idPed, draftEnvio)
      toast.success('Envío actualizado')
    } catch (err) {
      toast.error('No se pudo actualizar el envío', err.message)
    }
  }

  const filteredPedidos = useMemo(() => {
    let result = pedidos
    if (estadoFiltro) {
      result = result.filter((p) => p.estado === estadoFiltro)
    }
    if (search.trim()) {
      const term = search.trim().toLowerCase()
      result = result.filter(
        (p) => p.cliente.toLowerCase().includes(term) || String(p.idPed).includes(term)
      )
    }
    return result
  }, [pedidos, search, estadoFiltro])

  // El backend ya crea la notificación al cliente al cambiar el estado —
  // no hace falta dispararla a mano como antes con NotificationsContext.
  const handleEstadoChange = async (idPed, estado) => {
    try {
      await updateOrderStatus(idPed, estado)
      toast.success('Estado del pedido actualizado')
    } catch (err) {
      toast.error('No se pudo actualizar el estado', err.message)
    }
  }

  const badgeClass = (estado) => {
    if (estado === 'Entregado') return 'bg-success-subtle text-success'
    if (estado === 'Cancelado') return 'bg-danger-subtle text-danger'
    if (estado === 'En Camino') return 'bg-primary-subtle text-primary'
    return 'bg-warning-subtle text-warning'
  }

  return (
    <div className='container py-5'>
      <div className='admin-page-header'>
        <h1 className='admin-page-header__title'>📦 Gestión de Pedidos</h1>
        <p className='admin-page-header__sub'>Administra los pedidos de los clientes</p>
        <div className='admin-page-header__badges'>
          <span className='admin-badge'>📊 Total: {pedidos.length}</span>
          <span className='admin-badge'>⏳ Pendientes: {pedidos.filter(p=>p.estado==='Pendiente').length}</span>
          <span className='admin-badge'>🚚 En Camino: {pedidos.filter(p=>p.estado==='En Camino').length}</span>
          <span className='admin-badge'>✅ Entregados: {pedidos.filter(p=>p.estado==='Entregado').length}</span>
        </div>
      </div>

      <div className='card border-0 shadow-sm rounded-4'>
        <div className='p-3 border-bottom d-flex flex-wrap gap-2 align-items-center'>
          <div className='input-group' style={{ maxWidth: '280px' }}>
            <span className='input-group-text bg-white border-end-0'>
              <Search size={16} className='text-muted' />
            </span>
            <input
              type='search'
              className='form-control border-start-0'
              placeholder='Buscar por cliente o # pedido...'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label='Buscar pedidos'
            />
          </div>

          <select
            className='form-select'
            style={{ maxWidth: '180px' }}
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            aria-label='Filtrar por estado'
          >
            <option value=''>Todos los estados</option>
            {ESTADOS.map((estado) => (
              <option key={estado} value={estado}>{estado}</option>
            ))}
          </select>
        </div>

        <div className='table-responsive'>
          <table className='table table-hover mb-0'>
            <thead>
              <tr>
                <th>ID</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Total</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {filteredPedidos.map((pedido) => (
                <Fragment key={pedido.idPed}>
                  <tr>
                    <td>#{pedido.idPed}</td>
                    <td>{pedido.cliente}</td>
                    <td>{formatDate(pedido.fecha_pedido)}</td>
                    <td>
                      <select
                        className={`estado-select estado-select--${pedido.estado === 'En Camino' ? 'en-camino' : pedido.estado}`}
                        value={pedido.estado}
                        onChange={(e) => handleEstadoChange(pedido.idPed, e.target.value)}
                      >
                        {ESTADOS.map((estado) => (
                          <option key={estado} value={estado}>{estado}</option>
                        ))}
                      </select>
                    </td>
                    <td>{formatCurrency(pedido.total)}</td>
                    <td>
                      <button
                        className='btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1'
                        onClick={() => toggleExpand(pedido.idPed)}
                      >
                        {expandedId === pedido.idPed ? 'Ocultar' : 'Ver'}
                        {expandedId === pedido.idPed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </td>
                  </tr>

                  {expandedId === pedido.idPed && (
                    <tr>
                      <td colSpan='6' className='bg-light'>
                        <div className='row g-3'>
                          <div className='col-md-5'>
                            <p className='fw-semibold small mb-1'>Productos</p>
                            <ul className='mb-0 small'>
                              {pedido.detalle.map((item) => (
                                <li key={item.idPro}>
                                  {item.cantidad} × {item.nombre} — {formatCurrency(item.precio_unitario)} c/u
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className='col-md-4'>
                            <p className='fw-semibold small mb-1'>Dirección de envío</p>
                            {pedido.direccion ? (
                              <p className='small mb-2'>
                                <span className='fw-semibold'>{pedido.direccion.etiqueta}</span> — {pedido.direccion.direccion}, {pedido.direccion.ciudad}
                                <br />
                                Tel: {pedido.direccion.telefono}
                              </p>
                            ) : (
                              <p className='small text-muted mb-2'>No especificada</p>
                            )}
                            <Link
                              to={`/factura/${pedido.idPed}`}
                              className='btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-2'
                            >
                              <FileText size={14} /> Ver factura
                            </Link>
                          </div>
                          <div className='col-md-3'>
                            <p className='fw-semibold small mb-1 d-flex align-items-center gap-1'>
                              <Truck size={14} /> Seguimiento de envío
                            </p>
                            <input
                              type='text'
                              className='form-control form-control-sm mb-2'
                              placeholder='Transportadora'
                              value={draftEnvio.transportadora}
                              onChange={(e) => setDraftEnvio((prev) => ({ ...prev, transportadora: e.target.value }))}
                            />
                            <input
                              type='text'
                              className='form-control form-control-sm mb-2'
                              placeholder='Número de guía'
                              value={draftEnvio.numero_guia}
                              onChange={(e) => setDraftEnvio((prev) => ({ ...prev, numero_guia: e.target.value }))}
                            />
                            <input
                              type='date'
                              className='form-control form-control-sm mb-2'
                              value={draftEnvio.fecha_estimada}
                              onChange={(e) => setDraftEnvio((prev) => ({ ...prev, fecha_estimada: e.target.value }))}
                            />
                            <button
                              type='button'
                              className='btn btn-primary btn-sm w-100'
                              onClick={() => handleSaveEnvio(pedido.idPed)}
                            >
                              Guardar envío
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}

              {filteredPedidos.length === 0 && (
                <tr>
                  <td colSpan='6' className='text-center text-muted py-5'>
                    <PackageSearch size={28} className='mb-2 d-block mx-auto' />
                    No hay pedidos que coincidan con el filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className='admin-table-footer'>
            <div className='admin-table-footer__item'><span className='admin-table-footer__label'>Total pedidos:</span><span className='admin-table-footer__value'>{pedidos.length}</span></div>
            <div className='admin-table-footer__item'><span className='admin-table-footer__label'>Pendientes:</span><span className='admin-table-footer__value admin-table-footer__value--warning'>{pedidos.filter(p=>p.estado==='Pendiente').length}</span></div>
            <div className='admin-table-footer__item'><span className='admin-table-footer__label'>En camino:</span><span className='admin-table-footer__value admin-table-footer__value--blue'>{pedidos.filter(p=>p.estado==='En Camino').length}</span></div>
            <div className='admin-table-footer__item'><span className='admin-table-footer__label'>Entregados:</span><span className='admin-table-footer__value admin-table-footer__value--success'>{pedidos.filter(p=>p.estado==='Entregado').length}</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OrderManagement
