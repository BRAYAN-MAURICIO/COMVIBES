import { useState, useMemo } from 'react'
import { useToast } from '../../context/ToastContext'
import { Pencil, Search, PackageSearch, TriangleAlert } from 'lucide-react'
import { nonNegativeNumber } from '../../utils/validators'
import { useProducts } from '../../context/ProductsContext'

const LOW_STOCK_THRESHOLD = 10

function StockManagement() {
  const toast = useToast()
  const { productos, setStock } = useProducts()
  const [editingId, setEditingId] = useState(null)
  const [draftValue, setDraftValue] = useState('')
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [onlyLowStock, setOnlyLowStock] = useState(false)

  const filteredProductos = useMemo(() => {
    let result = productos
    if (onlyLowStock) {
      result = result.filter((p) => p.stock < LOW_STOCK_THRESHOLD)
    }
    if (search.trim()) {
      const term = search.trim().toLowerCase()
      result = result.filter((p) => p.nombre.toLowerCase().includes(term))
    }
    return result
  }, [productos, search, onlyLowStock])

  const lowStockCount = productos.filter((p) => p.stock < LOW_STOCK_THRESHOLD).length
  const totalStock = productos.reduce((acc, p) => acc + (p.stock || 0), 0)

  const startEdit = (producto) => {
    setEditingId(producto.idPro)
    setDraftValue(String(producto.stock))
    setError('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setDraftValue('')
    setError('')
  }

  const saveEdit = async (idPro) => {
    const message = nonNegativeNumber(draftValue, 'El inventario')
    if (message) {
      setError(message)
      return
    }

    try {
      await setStock(idPro, Number(draftValue))
      toast.success('Inventario actualizado')
      cancelEdit()
    } catch (err) {
      toast.error('No se pudo actualizar el inventario', err.message)
    }
  }

  return (
    <div className='container py-5'>
      <div className='admin-page-header'>
        <h1 className='admin-page-header__title'>🔄 Gestión de Inventario</h1>
        <p className='admin-page-header__sub'>Actualiza el stock de los productos</p>
        <div className='admin-page-header__badges'>
          <span className='admin-badge'>📦 Total: {totalStock} unidades</span>
          <span className='admin-badge'>⚠️ Bajo stock: {lowStockCount}</span>
          <span className='admin-badge'>🚫 Agotados: {productos.filter(p => p.stock === 0).length}</span>
        </div>
      </div>

      <div className='card border-0 shadow-sm rounded-4'>
        <div className='p-3 border-bottom d-flex flex-wrap gap-3 align-items-center'>
          <div className='input-group' style={{ maxWidth: '280px' }}>
            <span className='input-group-text bg-white border-end-0'>
              <Search size={16} className='text-muted' />
            </span>
            <input
              type='search'
              className='form-control border-start-0'
              placeholder='Buscar producto...'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label='Buscar en inventario'
            />
          </div>

          <div className='form-check form-switch mb-0'>
            <input
              className='form-check-input'
              type='checkbox'
              role='switch'
              id='onlyLowStock'
              checked={onlyLowStock}
              onChange={(e) => setOnlyLowStock(e.target.checked)}
            />
            <label className='form-check-label d-flex align-items-center gap-1' htmlFor='onlyLowStock'>
              <TriangleAlert size={14} className='text-warning' /> Solo stock bajo
            </label>
          </div>
        </div>

        <div className='admin-table-wrapper'>
          <table className='admin-table'>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Stock</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProductos.map((producto) => {
                const isEditing = editingId === producto.idPro
                const isLow = producto.stock < LOW_STOCK_THRESHOLD

                return (
                  <tr key={producto.idPro}>
                    <td>{producto.nombre}</td>
                    <td style={{ maxWidth: '140px' }}>
                      {isEditing ? (
                        <>
                          <input
                            type='number'
                            className={`form-control form-control-sm ${error ? 'is-invalid' : ''}`}
                            value={draftValue}
                            onChange={(e) => {
                              setDraftValue(e.target.value)
                              setError('')
                            }}
                            autoFocus
                          />
                          {error && <div className='invalid-feedback'>{error}</div>}
                        </>
                      ) : (
                        producto.stock
                      )}
                    </td>
                    <td>
                      {producto.stock === 0 ? (
                        <span className='status-badge status-badge--agotado'>🚫 Agotado</span>
                      ) : isLow ? (
                        <span className='status-badge status-badge--bajo-stock'>⚠️ Bajo stock</span>
                      ) : (
                        <span className='status-badge status-badge--disponible'>✅ Disponible</span>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <div className='d-flex gap-2'>
                          <button className='btn btn-primary btn-sm' onClick={() => saveEdit(producto.idPro)}>
                            Guardar
                          </button>
                          <button className='btn btn-outline-secondary btn-sm' onClick={cancelEdit}>
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button className='btn btn-warning btn-sm d-inline-flex align-items-center gap-1' onClick={() => startEdit(producto)}>
                          <Pencil size={14} /> Actualizar stock
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}

              {filteredProductos.length === 0 && (
                <tr>
                  <td colSpan='4' className='text-center text-muted py-5'>
                    <PackageSearch size={28} className='mb-2 d-block mx-auto' />
                    No hay productos que coincidan con el filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className='admin-table-footer'>
            <div className='admin-table-footer__item'><span className='admin-table-footer__label'>Total:</span><span className='admin-table-footer__value'>{productos.length}</span></div>
            <div className='admin-table-footer__item'><span className='admin-table-footer__label'>Con stock:</span><span className='admin-table-footer__value admin-table-footer__value--success'>{productos.filter(p=>p.stock>0).length}</span></div>
            <div className='admin-table-footer__item'><span className='admin-table-footer__label'>Bajo stock:</span><span className='admin-table-footer__value admin-table-footer__value--warning'>{lowStockCount}</span></div>
            <div className='admin-table-footer__item'><span className='admin-table-footer__label'>Agotados:</span><span className='admin-table-footer__value admin-table-footer__value--danger'>{productos.filter(p=>p.stock===0).length}</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StockManagement
