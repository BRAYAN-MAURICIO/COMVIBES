import { Pencil, Trash2, Search, PackageSearch } from 'lucide-react'
import ProductImage from '../../products/ProductImage'
import { formatCurrency } from '../../../utils/formatters'

function StockBadge({ stock }) {
  if (stock === 0) return <span className='badge bg-danger'>Agotado</span>
  if (stock < 10) return <span className='badge bg-warning text-dark'>{stock}</span>
  return stock
}

function FilaProducto({ producto, categoriaNombre, onEdit, onDelete }) {
  return (
    <tr>
      <td>
        <div className='d-flex align-items-center gap-3'>
          <ProductImage
            src={producto.imagen}
            alt={producto.nombre}
            className='rounded-3'
            style={{ width: '44px', height: '44px', objectFit: 'cover' }}
            iconSize={18}
          />
          <div>
            <div className='fw-semibold'>{producto.nombre}</div>
            <small className='text-muted'>#{producto.idPro}</small>
          </div>
        </div>
      </td>
      <td>{categoriaNombre(producto.idCat)}</td>
      <td>{producto.proveedor || <span className='text-muted'>—</span>}</td>
      <td>{producto.marca || <span className='text-muted'>—</span>}</td>
      <td>{formatCurrency(producto.precio)}</td>
      <td><StockBadge stock={producto.stock} /></td>
      <td>
        <button
          className='btn btn-warning btn-sm me-2'
          onClick={() => onEdit(producto)}
          aria-label={`Editar ${producto.nombre}`}
          title='Editar'
        >
          <Pencil size={14} />
        </button>
        <button
          className='btn btn-danger btn-sm'
          onClick={() => onDelete(producto)}
          aria-label={`Eliminar ${producto.nombre}`}
          title='Eliminar'
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  )
}

function ItemResumen({ label, value, variante }) {
  return (
    <div className='admin-table-footer__item'>
      <span className='admin-table-footer__label'>{label}</span>
      <span className={`admin-table-footer__value${variante ? ` admin-table-footer__value--${variante}` : ''}`}>{value}</span>
    </div>
  )
}

// Buscador + tabla de productos + pie con el resumen de inventario.
// `productos` son los ya filtrados por la búsqueda; `resumen` se calcula
// sobre el catálogo completo en ProductManagement.
function ProductTable({ productos, resumen, search, onSearchChange, categoriaNombre, onEdit, onDelete }) {
  return (
    <div className='card border-0 shadow-sm rounded-4'>
      <div className='p-3 border-bottom'>
        <div className='input-group' style={{ maxWidth: '320px' }}>
          <span className='input-group-text bg-white border-end-0'>
            <Search size={16} className='text-muted' />
          </span>
          <input
            type='search'
            className='form-control border-start-0'
            placeholder='Buscar por nombre o categoría...'
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label='Buscar productos'
          />
        </div>
      </div>

      <div className='table-responsive'>
        <table className='table table-hover mb-0'>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Categoría</th>
              <th>Proveedor</th>
              <th>Marca</th>
              <th>Precio</th>
              <th>Stock</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productos.map((producto) => (
              <FilaProducto
                key={producto.idPro}
                producto={producto}
                categoriaNombre={categoriaNombre}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}

            {productos.length === 0 && (
              <tr>
                <td colSpan='7' className='text-center text-muted py-5'>
                  <PackageSearch size={28} className='mb-2 d-block mx-auto' />
                  {search ? `Sin resultados para "${search}"` : 'No hay productos registrados.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className='admin-table-footer'>
          <ItemResumen label='Total:' value={resumen.total} />
          <ItemResumen label='Con stock:' value={resumen.conStock} variante='success' />
          <ItemResumen label='Bajo stock:' value={resumen.bajoStock} variante='warning' />
          <ItemResumen label='Agotados:' value={resumen.agotados} variante='danger' />
        </div>
      </div>
    </div>
  )
}

export default ProductTable
