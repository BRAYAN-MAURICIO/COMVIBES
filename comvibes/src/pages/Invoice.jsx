import { useParams, Link, Navigate } from 'react-router-dom'
import { Printer, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useOrders } from '../context/OrdersContext'
import { useFacturas } from '../context/FacturasContext'
import { usePagos } from '../context/PagosContext'
import { formatCurrency, formatDate } from '../utils/formatters'

// Vista imprimible/descargable de la factura de un pedido.
// No usa ClientLayout (sin navbar/footer) para que al imprimir
// (window.print) solo salga el comprobante.
function Invoice() {
  const { idPed } = useParams()
  const { user, isAdmin } = useAuth()
  const { pedidos } = useOrders()
  const { getByOrder } = useFacturas()
  const { getByOrder: getPagoByOrder } = usePagos()

  const pedido = pedidos.find((p) => p.idPed === Number(idPed))
  const factura = pedido ? getByOrder(pedido.idPed) : null
  const pago = pedido ? getPagoByOrder(pedido.idPed) : null

  if (!pedido) {
    return <Navigate to='/pedidos' replace />
  }

  // Solo el dueño del pedido o un admin pueden ver la factura
  if (!isAdmin && pedido.idUsu !== user?.idUsu) {
    return <Navigate to='/pedidos' replace />
  }

  const subtotal = pedido.detalle.reduce((acc, item) => acc + item.precio_unitario * item.cantidad, 0)

  return (
    <div className='container py-5' style={{ maxWidth: '820px' }}>
      <div className='d-flex justify-content-between align-items-center mb-4 invoice-toolbar'>
        <Link to='/pedidos' className='btn btn-outline-secondary btn-sm d-flex align-items-center gap-2'>
          <ArrowLeft size={15} /> Volver a mis pedidos
        </Link>
        <button
          type='button'
          className='btn btn-primary btn-sm d-flex align-items-center gap-2'
          onClick={() => window.print()}
        >
          <Printer size={15} /> Imprimir / Descargar PDF
        </button>
      </div>

      <div className='card border-0 shadow rounded-4 p-4 p-md-5 invoice-sheet'>
        <div className='d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4 pb-4 border-bottom'>
          <div>
            <h2 className='fw-bold text-primary mb-1'>Good Vibes Store</h2>
            <p className='text-muted small mb-0'>ComVibes — Comercio electrónico</p>
            <p className='text-muted small mb-0'>La Plata, Huila, Colombia</p>
          </div>
          <div className='text-md-end'>
            <div className='d-flex align-items-center gap-2 justify-content-md-end mb-1'>
              <CheckCircle2 size={18} className='text-success' />
              <h4 className='fw-bold mb-0'>Factura</h4>
            </div>
            <p className='mb-0 fw-semibold'>{factura?.numero_factura || `FAC-${String(pedido.idPed).padStart(6, '0')}`}</p>
            <p className='text-muted small mb-0'>Fecha de emisión: {formatDate(factura?.fecha_emision || pedido.fecha_pedido)}</p>
          </div>
        </div>

        <div className='row mb-4'>
          <div className='col-md-6 mb-3 mb-md-0'>
            <h6 className='fw-bold small text-uppercase text-muted mb-2'>Facturado a</h6>
            <p className='mb-0 fw-semibold'>{pedido.cliente}</p>
            {pedido.direccion ? (
              <>
                <p className='mb-0 small'>{pedido.direccion.direccion}</p>
                <p className='mb-0 small'>
                  {[pedido.direccion.ciudad, pedido.direccion.departamento].filter(Boolean).join(', ')}
                </p>
                <p className='mb-0 small'>Tel: {pedido.direccion.telefono}</p>
              </>
            ) : (
              <p className='mb-0 small text-muted'>Sin dirección registrada</p>
            )}
          </div>
          <div className='col-md-6'>
            <h6 className='fw-bold small text-uppercase text-muted mb-2'>Pedido</h6>
            <p className='mb-0 small'>Número de pedido: <strong>#{pedido.idPed}</strong></p>
            <p className='mb-0 small'>Fecha del pedido: {formatDate(pedido.fecha_pedido)}</p>
            <p className='mb-0 small'>Estado: {pedido.estado}</p>
          </div>
        </div>

        <div className='table-responsive mb-4'>
          <table className='table'>
            <thead>
              <tr className='border-bottom'>
                <th>Producto</th>
                <th className='text-center'>Cantidad</th>
                <th className='text-end'>Precio unitario</th>
                <th className='text-end'>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {pedido.detalle.map((item) => (
                <tr key={item.idPro}>
                  <td>{item.nombre}</td>
                  <td className='text-center'>{item.cantidad}</td>
                  <td className='text-end'>{formatCurrency(item.precio_unitario)}</td>
                  <td className='text-end'>{formatCurrency(item.precio_unitario * item.cantidad)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className='d-flex justify-content-between align-items-end flex-wrap gap-3'>
          {pago && (
            <div className='small'>
              <p className='mb-0 text-muted'>Método de pago: <strong>{pago.metodo}</strong></p>
              <p className='mb-0'>
                Estado: <span className='badge bg-success-subtle text-success'>{pago.estado}</span>
              </p>
            </div>
          )}

          <div style={{ minWidth: '240px' }}>
            <div className='d-flex justify-content-between small mb-1'>
              <span className='text-muted'>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className='d-flex justify-content-between fw-bold fs-5 pt-2 border-top'>
              <span>Total</span>
              <span className='text-primary'>{formatCurrency(pedido.total)}</span>
            </div>
          </div>
        </div>

        <p className='text-muted small text-center mt-5 mb-0'>
          Gracias por tu compra en Good Vibes Store — este documento es un comprobante generado electrónicamente.
        </p>
      </div>
    </div>
  )
}

export default Invoice
