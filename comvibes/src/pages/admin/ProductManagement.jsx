import { useState, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { useToast } from '../../context/ToastContext'
import { useProducts } from '../../context/ProductsContext'
import { useCategories } from '../../context/CategoriesContext'
import { useProviders } from '../../context/ProvidersContext'
import ConfirmModal from '../../components/modals/ConfirmModal'
import ProductForm from '../../components/admin/products/ProductForm'
import ProductTable from '../../components/admin/products/ProductTable'
import { required, positiveNumber, nonNegativeNumber, runValidations } from '../../utils/validators'

// Refactorización QA (No Conformidad 3): este archivo tenía 633 líneas y
// ~13 useState con la tabla, el formulario, la galería de imágenes y los
// mini-formularios de categoría/proveedor mezclados. Ahora es el contenedor:
// guarda el estado del producto, valida, habla con los contexts y compone
//   · ProductTable      → buscador, tabla y resumen de inventario
//   · ProductForm       → formulario de creación/edición
//       · ImageUploader    → galería (subir, reemplazar, quitar)
//       · QuickCreateField → crear categoría o proveedor inline
// (todos en components/admin/products/).

const emptyForm = {
  nombre: '',
  descripcion: '',
  precio: '',
  idCat: '',
  idProv: '',
  stock: '',
  imagen: '',
  marca: '',
  color: '',
  talla: '',
}

function formDesdeProducto(producto) {
  return {
    nombre: producto.nombre,
    descripcion: producto.descripcion,
    precio: producto.precio,
    idCat: producto.idCat,
    idProv: producto.idProv || '',
    stock: producto.stock,
    imagen: producto.imagen || '',
    marca: producto.marca || '',
    color: producto.color || '',
    talla: producto.talla || '',
  }
}

function validarProducto(form) {
  return runValidations({
    nombre: [form.nombre, [(v) => required(v, 'El nombre')]],
    precio: [form.precio, [(v) => required(v, 'El precio'), (v) => positiveNumber(v, 'El precio')]],
    idCat: [form.idCat, [(v) => required(v, 'La categoría')]],
    stock: [form.stock, [(v) => required(v, 'El inventario'), (v) => nonNegativeNumber(v, 'El inventario')]],
  })
}

// Payload que espera el API. La primera foto de la galería es la principal.
function construirPayload(form, galeria) {
  return {
    nombre: form.nombre,
    descripcion: form.descripcion,
    precio: Number(form.precio),
    idCat: Number(form.idCat),
    idProv: form.idProv ? Number(form.idProv) : null,
    stock: Number(form.stock),
    activo: true,
    imagen: galeria[0] || form.imagen || null,
    imagenes: galeria.length > 0 ? galeria : (form.imagen ? [form.imagen] : []),
    marca: form.marca || null,
    color: form.color || null,
    talla: form.talla || null,
  }
}

function ProductManagement() {
  const toast = useToast()
  const { productos, totalProductos, createProduct, updateProduct, deleteProduct } = useProducts()
  const { categorias, createCategory } = useCategories()
  const { proveedores, addProvider } = useProviders()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [galeria, setGaleria] = useState([]) // URLs ya subidas; la [0] es la principal
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [search, setSearch] = useState('')

  const categoriaNombre = (idCat) =>
    categorias.find((c) => c.idCat === Number(idCat))?.nombre || 'Sin categoría'

  const filteredProductos = useMemo(() => {
    if (!search.trim()) return productos
    const term = search.trim().toLowerCase()
    return productos.filter(
      (p) => p.nombre.toLowerCase().includes(term) || categoriaNombre(p.idCat).toLowerCase().includes(term)
    )
  }, [productos, search])

  const resumen = useMemo(() => ({
    total: productos.length,
    conStock: productos.filter((p) => p.stock > 0).length,
    bajoStock: productos.filter((p) => p.stock > 0 && p.stock < 10).length,
    agotados: productos.filter((p) => p.stock === 0).length,
  }), [productos])

  const abrirFormulario = ({ datos, imagenes, idPro }) => {
    setForm(datos)
    setGaleria(imagenes)
    setErrors({})
    setEditingId(idPro)
    setShowForm(true)
  }

  const openCreateForm = () => abrirFormulario({ datos: emptyForm, imagenes: [], idPro: null })

  const openEditForm = (producto) =>
    abrirFormulario({
      datos: formDesdeProducto(producto),
      imagenes: producto.imagenes || (producto.imagen ? [producto.imagen] : []),
      idPro: producto.idPro,
    })

  // La imagen principal del formulario sigue siempre a la primera foto de
  // la galería (igual que antes, cuando cada handler la sincronizaba a mano).
  const actualizarGaleria = (updater) => {
    setGaleria((prev) => {
      const next = updater(prev)
      setForm((f) => ({ ...f, imagen: next[0] || '' }))
      return next
    })
  }

  const crearCategoria = async (nombre) => {
    try {
      const nueva = await createCategory({ nombre })
      setForm((prev) => ({ ...prev, idCat: nueva.idCat }))
      toast.success(`Categoría "${nueva.nombre}" creada y seleccionada`)
    } catch (err) {
      toast.error('No se pudo crear la categoría', err.message)
      throw err
    }
  }

  const crearProveedor = async (nombre) => {
    try {
      const nuevo = await addProvider({ nombre })
      setForm((prev) => ({ ...prev, idProv: nuevo.idProv }))
      toast.success(`Proveedor "${nuevo.nombre}" creado y seleccionado`)
    } catch (err) {
      toast.error('No se pudo crear el proveedor', err.message)
      throw err
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const validationErrors = validarProducto(form)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    const payload = construirPayload(form, galeria)
    try {
      if (editingId) {
        await updateProduct(editingId, payload)
        toast.success('Producto actualizado')
      } else {
        await createProduct(payload)
        toast.success('Producto creado')
      }
      setShowForm(false)
      setForm(emptyForm)
      setEditingId(null)
    } catch (err) {
      toast.error('No se pudo guardar el producto', err.message)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteProduct(deleteTarget.idPro)
      toast.success('Producto eliminado')
    } catch (err) {
      toast.error('No se pudo eliminar el producto', err.message)
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <div className='container py-5'>
      <div className='d-flex justify-content-between align-items-start flex-wrap gap-3 mb-3'>
        <div className='admin-page-header flex-grow-1'>
          <h1 className='admin-page-header__title'>📦 Gestión de Productos</h1>
          <p className='admin-page-header__sub'>Administra el catálogo de productos</p>
          <div className='admin-page-header__badges'>
            <span className='admin-badge'>📊 Total: {totalProductos || resumen.total}</span>
            <span className='admin-badge'>⚠️ Bajo stock: {resumen.bajoStock}</span>
            <span className='admin-badge'>🚫 Agotados: {resumen.agotados}</span>
          </div>
        </div>
        <button className='btn btn-primary d-flex align-items-center gap-1 mt-2' onClick={openCreateForm}>
          <Plus size={16} /> Crear Producto
        </button>
      </div>

      {showForm && (
        // key: al pasar de un producto a otro (o a "nuevo") el formulario se
        // monta de cero y los mini-formularios de categoría/proveedor se cierran.
        <ProductForm
          key={editingId ?? 'nuevo'}
          form={form}
          errors={errors}
          isEditing={Boolean(editingId)}
          categorias={categorias}
          proveedores={proveedores}
          galeria={galeria}
          onChange={handleChange}
          onGaleriaChange={actualizarGaleria}
          onCreateCategoria={crearCategoria}
          onCreateProveedor={crearProveedor}
          onSubmit={handleSubmit}
          onCancel={() => setShowForm(false)}
        />
      )}

      <ProductTable
        productos={filteredProductos}
        resumen={resumen}
        search={search}
        onSearchChange={setSearch}
        categoriaNombre={categoriaNombre}
        onEdit={openEditForm}
        onDelete={setDeleteTarget}
      />

      <ConfirmModal
        show={Boolean(deleteTarget)}
        title='Eliminar producto'
        message={`¿Seguro que deseas eliminar "${deleteTarget?.nombre}"? Esta acción no se puede deshacer.`}
        confirmLabel='Eliminar'
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

export default ProductManagement
