import { useState, useMemo } from 'react'
import { useToast } from '../../context/ToastContext'
import { Plus, Pencil, Trash2, Search, PackageSearch, PackagePlus, FolderPlus, Truck } from 'lucide-react'
import ConfirmModal from '../../components/modals/ConfirmModal'
import ProductImage from '../../components/products/ProductImage'
import { useProducts } from '../../context/ProductsContext'
import { required, positiveNumber, nonNegativeNumber, runValidations } from '../../utils/validators'
import { formatCurrency } from '../../utils/formatters'
import { useCategories } from '../../context/CategoriesContext'
import { uploadImagen, resolveImageUrl, deleteImagen } from '../../api/uploads'
import placeholderSvg from '../../assets/img/productos/placeholder.svg'
import { useProviders } from '../../context/ProvidersContext'

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

function ProductManagement() {
  const toast = useToast()
  const { productos, totalProductos, createProduct, updateProduct, deleteProduct } = useProducts()
  const { categorias, createCategory } = useCategories()
  const { proveedores, addProvider } = useProviders()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [search, setSearch] = useState('')

  // Upload de imágenes
  const [uploadingImg, setUploadingImg] = useState(false)
  const [galeria, setGaleria]           = useState([]) // URLs ya subidas (galería)

  // Mini-formularios inline para crear categoría o proveedor sin salir del formulario
  const [newCatOpen, setNewCatOpen]   = useState(false)
  const [newCatName, setNewCatName]   = useState('')
  const [savingCat, setSavingCat]     = useState(false)
  const [newProvOpen, setNewProvOpen] = useState(false)
  const [newProvName, setNewProvName] = useState('')
  const [savingProv, setSavingProv]   = useState(false)

  const categoriaNombre = (idCat) =>
    categorias.find((c) => c.idCat === Number(idCat))?.nombre || 'Sin categoría'

  const filteredProductos = useMemo(() => {
    if (!search.trim()) return productos
    const term = search.trim().toLowerCase()
    return productos.filter(
      (p) => p.nombre.toLowerCase().includes(term) || categoriaNombre(p.idCat).toLowerCase().includes(term)
    )
  }, [productos, search])

  const openCreateForm = () => {
    setForm(emptyForm)
    setErrors({})
    setEditingId(null)
    setNewCatOpen(false)
    setNewProvOpen(false)
    setGaleria([])
    setShowForm(true)
  }

  const openEditForm = (producto) => {
    const imgs = producto.imagenes || (producto.imagen ? [producto.imagen] : [])
    setGaleria(imgs)
    setForm({
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
    })
    setErrors({})
    setEditingId(producto.idPro)
    setShowForm(true)
  }

  const handleCreateCat = async () => {
    if (!newCatName.trim()) return
    setSavingCat(true)
    try {
      const nueva = await createCategory({ nombre: newCatName.trim() })
      setForm((prev) => ({ ...prev, idCat: nueva.idCat }))
      setNewCatName('')
      setNewCatOpen(false)
      toast.success(`Categoría "${nueva.nombre}" creada y seleccionada`)
    } catch (err) {
      toast.error('No se pudo crear la categoría', err.message)
    } finally {
      setSavingCat(false)
    }
  }

  const handleCreateProv = async () => {
    if (!newProvName.trim()) return
    setSavingProv(true)
    try {
      const nuevo = await addProvider({ nombre: newProvName.trim() })
      setForm((prev) => ({ ...prev, idProv: nuevo.idProv }))
      setNewProvName('')
      setNewProvOpen(false)
      toast.success(`Proveedor "${nuevo.nombre}" creado y seleccionado`)
    } catch (err) {
      toast.error('No se pudo crear el proveedor', err.message)
    } finally {
      setSavingProv(false)
    }
  }

  const handleImageUpload = async (e, index = null) => {
    const file = e.target.files?.[0]
    if (!file) return
    // 8 MB: el backend recomprime con sharp antes de guardar, así que conviene
    // subir la foto buena en vez de una miniatura ya comprimida.
    if (file.size > 8 * 1024 * 1024) {
      toast.warning('Imagen demasiado grande', 'El tamaño máximo es 8 MB')
      e.target.value = ''
      return
    }
    setUploadingImg(true)
    try {
      const { url, advertencia, dimensiones } = await uploadImagen(file)
      if (index === null) {
        // Agregar a la galería
        setGaleria(prev => [...prev, url])
        if (galeria.length === 0) setForm(prev => ({ ...prev, imagen: url }))
      } else {
        // Reemplazar en la posición dada
        setGaleria(prev => prev.map((u, i) => i === index ? url : u))
        if (index === 0) setForm(prev => ({ ...prev, imagen: url }))
      }
      // El backend acepta las imágenes chicas, pero avisa: son las que se ven
      // borrosas en la ficha del producto.
      if (advertencia) {
        toast.warning('Imagen de baja resolución', advertencia)
      } else {
        toast.success('Imagen subida correctamente', `Optimizada a ${dimensiones} px`)
      }
    } catch (err) {
      toast.error('No se pudo subir la imagen', err.message)
    } finally {
      setUploadingImg(false)
    }
  }

  const handleRemoveImage = (index) => {
    setGaleria(prev => {
      const url = prev[index]
      // Solo eliminar del servidor si fue subida por el admin (ruta /uploads/)
      if (url && url.includes('/uploads/')) {
        deleteImagen(url) // fire-and-forget — no bloquea la UI
      }
      const updated = prev.filter((_, i) => i !== index)
      setForm(p => ({ ...p, imagen: updated[0] || '' }))
      return updated
    })
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const validate = () =>
    runValidations({
      nombre: [form.nombre, [(v) => required(v, 'El nombre')]],
      precio: [form.precio, [(v) => required(v, 'El precio'), (v) => positiveNumber(v, 'El precio')]],
      idCat: [form.idCat, [(v) => required(v, 'La categoría')]],
      stock: [form.stock, [(v) => required(v, 'El inventario'), (v) => nonNegativeNumber(v, 'El inventario')]],
    })

  const handleSubmit = async (e) => {
    e.preventDefault()

    const validationErrors = validate()
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    const imagenPrincipal = galeria[0] || form.imagen || null
    const todasLasImagenes = galeria.length > 0 ? galeria : (form.imagen ? [form.imagen] : [])

    const payload = {
      nombre: form.nombre,
      descripcion: form.descripcion,
      precio: Number(form.precio),
      idCat: Number(form.idCat),
      idProv: form.idProv ? Number(form.idProv) : null,
      stock: Number(form.stock),
      activo: true,
      imagen: imagenPrincipal,
      imagenes: todasLasImagenes,
      marca: form.marca || null,
      color: form.color || null,
      talla: form.talla || null,
    }

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
            <span className='admin-badge'>📊 Total: {totalProductos || productos.length}</span>
            <span className='admin-badge'>⚠️ Bajo stock: {productos.filter(p=>p.stock>0&&p.stock<10).length}</span>
            <span className='admin-badge'>🚫 Agotados: {productos.filter(p=>p.stock===0).length}</span>
          </div>
        </div>
        <button className='btn btn-primary d-flex align-items-center gap-1 mt-2' onClick={openCreateForm}>
          <Plus size={16} /> Crear Producto
        </button>
      </div>

      {showForm && (
        <div className='card shadow border-0 rounded-4 p-4 mb-4'>
          <div className='d-flex align-items-center gap-2 mb-3'>
            <div className='icon-badge icon-badge--blue'>
              <PackagePlus size={20} />
            </div>
            <h5 className='fw-bold mb-0'>{editingId ? 'Editar producto' : 'Nuevo producto'}</h5>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className='row'>
              <div className='col-md-6 mb-3'>
                <label htmlFor='nombre' className='form-label'>Nombre</label>
                <input
                  id='nombre'
                  name='nombre'
                  className={`form-control ${errors.nombre ? 'is-invalid' : ''}`}
                  value={form.nombre}
                  onChange={handleChange}
                />
                {errors.nombre && <div className='invalid-feedback'>{errors.nombre}</div>}
              </div>

              <div className='col-md-6 mb-3'>
                <div className='d-flex justify-content-between align-items-center mb-1'>
                  <label htmlFor='idCat' className='form-label mb-0'>Categoría</label>
                  <button
                    type='button'
                    className='btn btn-link btn-sm p-0 d-flex align-items-center gap-1 text-decoration-none'
                    onClick={() => { setNewCatOpen((v) => !v); setNewCatName('') }}
                  >
                    <FolderPlus size={13} />
                    <span style={{ fontSize: '0.78rem' }}>{newCatOpen ? 'Cancelar' : 'Nueva'}</span>
                  </button>
                </div>
                <select
                  id='idCat'
                  name='idCat'
                  className={`form-select ${errors.idCat ? 'is-invalid' : ''}`}
                  value={form.idCat}
                  onChange={handleChange}
                >
                  <option value=''>Selecciona una categoría</option>
                  {categorias.map((cat) => (
                    <option key={cat.idCat} value={cat.idCat}>{cat.nombre}</option>
                  ))}
                </select>
                {errors.idCat && <div className='invalid-feedback'>{errors.idCat}</div>}
                {newCatOpen && (
                  <div className='d-flex gap-2 mt-2'>
                    <input
                      type='text'
                      className='form-control form-control-sm'
                      placeholder='Nombre de la nueva categoría'
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleCreateCat())}
                      autoFocus
                    />
                    <button
                      type='button'
                      className='btn btn-success btn-sm flex-shrink-0'
                      onClick={handleCreateCat}
                      disabled={savingCat || !newCatName.trim()}
                    >
                      {savingCat ? '…' : 'Crear'}
                    </button>
                  </div>
                )}
              </div>

              <div className='col-md-6 mb-3'>
                <div className='d-flex justify-content-between align-items-center mb-1'>
                  <label htmlFor='idProv' className='form-label mb-0'>
                    Proveedor <span className='text-muted small'>(opcional)</span>
                  </label>
                  <button
                    type='button'
                    className='btn btn-link btn-sm p-0 d-flex align-items-center gap-1 text-decoration-none'
                    onClick={() => { setNewProvOpen((v) => !v); setNewProvName('') }}
                  >
                    <Truck size={13} />
                    <span style={{ fontSize: '0.78rem' }}>{newProvOpen ? 'Cancelar' : 'Nuevo'}</span>
                  </button>
                </div>
                <select
                  id='idProv'
                  name='idProv'
                  className='form-select'
                  value={form.idProv}
                  onChange={handleChange}
                >
                  <option value=''>Sin proveedor asignado</option>
                  {proveedores.map((prov) => (
                    <option key={prov.idProv} value={prov.idProv}>{prov.nombre}</option>
                  ))}
                </select>
                {newProvOpen && (
                  <div className='d-flex gap-2 mt-2'>
                    <input
                      type='text'
                      className='form-control form-control-sm'
                      placeholder='Nombre del nuevo proveedor'
                      value={newProvName}
                      onChange={(e) => setNewProvName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleCreateProv())}
                      autoFocus
                    />
                    <button
                      type='button'
                      className='btn btn-success btn-sm flex-shrink-0'
                      onClick={handleCreateProv}
                      disabled={savingProv || !newProvName.trim()}
                    >
                      {savingProv ? '…' : 'Crear'}
                    </button>
                  </div>
                )}
              </div>

              <div className='col-md-4 mb-3'>
                <label htmlFor='precio' className='form-label'>Precio</label>
                <input
                  id='precio'
                  name='precio'
                  type='number'
                  className={`form-control ${errors.precio ? 'is-invalid' : ''}`}
                  value={form.precio}
                  onChange={handleChange}
                />
                {errors.precio && <div className='invalid-feedback'>{errors.precio}</div>}
              </div>

              <div className='col-md-4 mb-3'>
                <label htmlFor='stock' className='form-label'>Inventario</label>
                <input
                  id='stock'
                  name='stock'
                  type='number'
                  className={`form-control ${errors.stock ? 'is-invalid' : ''}`}
                  value={form.stock}
                  onChange={handleChange}
                />
                {errors.stock && <div className='invalid-feedback'>{errors.stock}</div>}
              </div>

              <div className='col-md-4 mb-3'>
                <label htmlFor='marca' className='form-label'>Marca</label>
                <input
                  id='marca'
                  name='marca'
                  className='form-control'
                  value={form.marca}
                  onChange={handleChange}
                  placeholder='Ej: ComVibes Leather'
                />
              </div>

              <div className='col-md-4 mb-3'>
                <label htmlFor='color' className='form-label'>Color</label>
                <input
                  id='color'
                  name='color'
                  className='form-control'
                  value={form.color}
                  onChange={handleChange}
                  placeholder='Ej: Negro'
                />
              </div>

              <div className='col-md-4 mb-3'>
                <label htmlFor='talla' className='form-label'>Talla</label>
                <input
                  id='talla'
                  name='talla'
                  className='form-control'
                  value={form.talla}
                  onChange={handleChange}
                  placeholder='Ej: S - XL (dejar vacío si no aplica)'
                />
              </div>

              <div className='col-12 mb-3'>
                <label className='form-label'>Imágenes del producto</label>

                {/* Galería de fotos ya subidas */}
                <div className='d-flex flex-wrap gap-3 mb-3'>
                  {galeria.map((url, i) => (
                    <div key={url + i} className='position-relative' style={{ width: 100, height: 100 }}>
                      <img
                        src={resolveImageUrl(url)}
                        alt={`Foto ${i + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, border: i === 0 ? '2px solid #3b82f6' : '1px solid #e5e7eb' }}
                        onError={e => { e.target.src = placeholderSvg }}
                      />
                      {i === 0 && (
                        <span style={{ position:'absolute', bottom:2, left:2, background:'#3b82f6', color:'#fff', fontSize:'0.6rem', fontWeight:700, borderRadius:4, padding:'1px 5px' }}>
                          Principal
                        </span>
                      )}
                      <button
                        type='button'
                        className='btn btn-danger btn-sm rounded-circle d-flex align-items-center justify-content-center'
                        style={{ position:'absolute', top:-6, right:-6, width:22, height:22, padding:0, fontSize:'0.7rem', lineHeight:1 }}
                        onClick={() => handleRemoveImage(i)}
                        aria-label={`Quitar foto ${i + 1}`}
                      >✕</button>
                      {/* Reemplazar imagen existente */}
                      <label
                        style={{ position:'absolute', bottom:2, right:2, background:'rgba(0,0,0,0.55)', color:'#fff', fontSize:'0.65rem', borderRadius:4, padding:'1px 5px', cursor:'pointer' }}
                        title='Reemplazar'
                      >
                        ↺
                        <input type='file' accept='image/*' className='d-none'
                          onChange={e => handleImageUpload(e, i)} />
                      </label>
                    </div>
                  ))}

                  {/* Botón agregar nueva foto */}
                  {galeria.length < 5 && (
                    <label
                      style={{ width:100, height:100, border:'2px dashed #cbd5e1', borderRadius:8, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#64748b', fontSize:'0.78rem', gap:4 }}
                      title='Subir imagen'
                    >
                      {uploadingImg ? '⏳' : '＋'}
                      <span>{uploadingImg ? 'Subiendo...' : 'Agregar foto'}</span>
                      <input type='file' accept='image/jpeg,image/png,image/webp'
                        className='d-none' disabled={uploadingImg}
                        onChange={e => handleImageUpload(e)} />
                    </label>
                  )}
                </div>

                <small className='text-muted'>
                  La primera foto es la imagen principal. Máx. 5 fotos, 2 MB c/u. JPG, PNG o WEBP.
                </small>
              </div>

              <div className='col-12 mb-3'>
                <label htmlFor='descripcion' className='form-label'>Descripción</label>
                <textarea
                  id='descripcion'
                  name='descripcion'
                  className='form-control'
                  rows='3'
                  value={form.descripcion}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className='d-flex gap-2'>
              <button type='submit' className='btn btn-primary'>
                {editingId ? 'Guardar cambios' : 'Crear producto'}
              </button>
              <button type='button' className='btn btn-outline-secondary' onClick={() => setShowForm(false)}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

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
              onChange={(e) => setSearch(e.target.value)}
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
              {filteredProductos.map((producto) => (
                <tr key={producto.idPro}>
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
                  <td>
                    {producto.stock === 0 ? (
                      <span className='badge bg-danger'>Agotado</span>
                    ) : producto.stock < 10 ? (
                      <span className='badge bg-warning text-dark'>{producto.stock}</span>
                    ) : (
                      producto.stock
                    )}
                  </td>
                  <td>
                    <button
                      className='btn btn-warning btn-sm me-2'
                      onClick={() => openEditForm(producto)}
                      aria-label={`Editar ${producto.nombre}`}
                      title='Editar'
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className='btn btn-danger btn-sm'
                      onClick={() => setDeleteTarget(producto)}
                      aria-label={`Eliminar ${producto.nombre}`}
                      title='Eliminar'
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}

              {filteredProductos.length === 0 && (
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
            <div className='admin-table-footer__item'><span className='admin-table-footer__label'>Total:</span><span className='admin-table-footer__value'>{productos.length}</span></div>
            <div className='admin-table-footer__item'><span className='admin-table-footer__label'>Con stock:</span><span className='admin-table-footer__value admin-table-footer__value--success'>{productos.filter(p=>p.stock>0).length}</span></div>
            <div className='admin-table-footer__item'><span className='admin-table-footer__label'>Bajo stock:</span><span className='admin-table-footer__value admin-table-footer__value--warning'>{productos.filter(p=>p.stock>0&&p.stock<10).length}</span></div>
            <div className='admin-table-footer__item'><span className='admin-table-footer__label'>Agotados:</span><span className='admin-table-footer__value admin-table-footer__value--danger'>{productos.filter(p=>p.stock===0).length}</span></div>
          </div>
        </div>
      </div>

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
