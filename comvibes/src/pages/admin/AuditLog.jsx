import { useState, useEffect } from 'react'
import { useToast } from '../../context/ToastContext'
import Pagination from '../../components/ui/Pagination'
import * as auditoriaApi from '../../api/auditoria'

// Bitácora de acciones administrativas: quién cambió qué, cuándo y desde qué
// IP. Auditoría ISO 2026-09-26, hallazgo H12 (ISO/IEC 27001 A.8.15).

const ENTIDADES = [
  { valor: '', etiqueta: 'Todo' },
  { valor: 'pedido', etiqueta: 'Pedidos y envíos' },
  { valor: 'producto', etiqueta: 'Productos' },
  { valor: 'usuario', etiqueta: 'Usuarios' },
  { valor: 'pqr', etiqueta: 'PQR' },
  { valor: 'categorias', etiqueta: 'Categorías' },
  { valor: 'proveedores', etiqueta: 'Proveedores' },
  { valor: 'metodospago', etiqueta: 'Métodos de pago' },
]

const ACCIONES = {
  'pedido.estado': 'Cambió el estado del pedido',
  'envio.actualizar': 'Actualizó el envío',
  'producto.crear': 'Creó el producto',
  'producto.editar': 'Editó el producto',
  'producto.desactivar': 'Desactivó el producto',
  'producto.stock': 'Ajustó el inventario',
  'usuario.rol': 'Cambió el rol',
  'usuario.estado': 'Cambió el estado de la cuenta',
  'usuario.datos': 'Editó los datos personales',
  'usuario.eliminar': 'Eliminó la cuenta',
  'pqr.responder': 'Respondió la PQR',
  'pqr.estado': 'Cambió el estado de la PQR',
}

const describirAccion = (accion) => {
  if (ACCIONES[accion]) return ACCIONES[accion]
  const [tabla, verbo] = accion.split('.')
  const verbos = { crear: 'Creó', editar: 'Editó', eliminar: 'Eliminó' }
  return `${verbos[verbo] || verbo} en ${tabla}`
}

const valorLegible = (v) => {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'sí' : 'no'
  return String(v)
}

// Convierte {antes, despues} en líneas "campo: viejo → nuevo".
function Cambios({ detalle }) {
  if (!detalle) return <span className='text-muted'>—</span>
  const antes = detalle.antes || {}
  const despues = detalle.despues || {}
  const campos = [...new Set([...Object.keys(antes), ...Object.keys(despues)])]
    // En altas y bajas completas (categorías, proveedores) sobran los ids
    .filter((c) => !/^id[A-Z]/.test(c) && c !== 'fecha_registro')
  if (campos.length === 0) return <span className='text-muted'>—</span>
  return (
    <ul className='list-unstyled mb-0 small'>
      {campos.slice(0, 6).map((c) => (
        <li key={c}>
          <strong>{c}:</strong>{' '}
          {c in antes && c in despues
            ? <>{valorLegible(antes[c])} → {valorLegible(despues[c])}</>
            : valorLegible(c in despues ? despues[c] : antes[c])}
        </li>
      ))}
    </ul>
  )
}

function AuditLog() {
  const toast = useToast()
  const [registros, setRegistros] = useState([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [entidad, setEntidad] = useState('')
  const [loading, setLoading] = useState(true)

  // La petición se dispara al cambiar página o filtro. El estado se actualiza
  // en los callbacks de la promesa (no directo en el efecto), y `vigente`
  // descarta la respuesta si el usuario cambió el filtro antes de que llegara.
  useEffect(() => {
    let vigente = true
    auditoriaApi
      .getAuditoria({ page, limit: 25, entidad: entidad || undefined })
      .then((res) => {
        if (!vigente) return
        setRegistros(res.registros)
        setTotal(res.total)
        setTotalPages(Math.max(1, res.totalPages))
      })
      .catch((err) => vigente && toast.error('No se pudo cargar la bitácora', err.message))
      .finally(() => vigente && setLoading(false))
    return () => { vigente = false }
  }, [page, entidad, toast])

  const cambiarFiltro = (valor) => {
    setLoading(true)
    setEntidad(valor)
    setPage(1)
  }

  const cambiarPagina = (n) => {
    setLoading(true)
    setPage(n)
  }

  return (
    <div className='container-fluid py-4 px-4' style={{ maxWidth: 1280 }}>
      <div className='admin-page-header'>
        <h1 className='admin-page-header__title'>🧾 Bitácora de auditoría</h1>
        <p className='admin-page-header__sub'>Registro de los cambios hechos desde el panel de administración</p>
        <div className='admin-page-header__badges'>
          <span className='admin-badge'>📋 Registros: {total}</span>
        </div>
      </div>

      <div className='mb-3' style={{ maxWidth: 280 }}>
        <label htmlFor='filtro-entidad' className='form-label small mb-1'>Tipo de registro</label>
        <select
          id='filtro-entidad'
          className='form-select'
          value={entidad}
          onChange={(e) => cambiarFiltro(e.target.value)}
        >
          {ENTIDADES.map((e) => <option key={e.valor} value={e.valor}>{e.etiqueta}</option>)}
        </select>
      </div>

      <div className='admin-table-wrapper'>
        <table className='admin-table'>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Administrador</th>
              <th>Acción</th>
              <th>Registro</th>
              <th>Cambio</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className='text-center text-muted py-4'>Cargando…</td></tr>
            ) : registros.length === 0 ? (
              <tr><td colSpan={6} className='text-center text-muted py-4'>Todavía no hay acciones registradas.</td></tr>
            ) : registros.map((r) => (
              <tr key={r.idAud}>
                <td className='text-nowrap'>{r.fecha}</td>
                <td>{r.admin || <span className='text-muted'>Cuenta eliminada</span>}</td>
                <td>{describirAccion(r.accion)}</td>
                <td className='text-nowrap'>{r.entidad} #{r.id_entidad ?? '—'}</td>
                <td><Cambios detalle={r.detalle} /></td>
                <td className='text-muted small'>{r.ip || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className='mt-3'>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={cambiarPagina} />
        </div>
      )}
    </div>
  )
}

export default AuditLog
