import { useState, useMemo } from 'react'
import { useToast } from '../../context/ToastContext'
import { Search, Plus, Pencil, Trash2, Building2 } from 'lucide-react'
import { useProviders } from '../../context/ProvidersContext'
import ConfirmModal from '../../components/modals/ConfirmModal'
import { required, onlyNumbers, isEmail, runValidations } from '../../utils/validators'

const emptyForm = { nombre: '', categoria: '', contacto: '', telefono: '', correo: '' }

function ProviderManagement() {
  const toast = useToast()
  const { proveedores, addProvider, updateProvider, deleteProvider } = useProviders()
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null) // null = crear, objeto = editar
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [toDelete, setToDelete] = useState(null)

  const filteredProveedores = useMemo(() => {
    if (!search.trim()) return proveedores
    const term = search.trim().toLowerCase()
    return proveedores.filter(
      (p) => p.nombre.toLowerCase().includes(term) || (p.categoria || '').toLowerCase().includes(term)
    )
  }, [proveedores, search])

  const handleOpenNew = () => {
    setEditing(null)
    setForm(emptyForm)
    setErrors({})
    setFormOpen(true)
  }

  const handleOpenEdit = (proveedor) => {
    setEditing(proveedor)
    setForm({
      nombre: proveedor.nombre,
      categoria: proveedor.categoria,
      contacto: proveedor.contacto,
      telefono: proveedor.telefono,
      correo: proveedor.correo,
    })
    setErrors({})
    setFormOpen(true)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const validate = () =>
    runValidations({
      nombre: [form.nombre, [(v) => required(v, 'El nombre')]],
      categoria: [form.categoria, [(v) => required(v, 'La categoría')]],
      contacto: [form.contacto, [(v) => required(v, 'El contacto')]],
      telefono: [form.telefono, [(v) => required(v, 'El teléfono'), (v) => onlyNumbers(v, 'El teléfono')]],
      correo: [form.correo, [(v) => required(v, 'El correo'), isEmail]],
    })

  const handleSubmit = async (e) => {
    e.preventDefault()
    const validationErrors = validate()
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    try {
      if (editing) {
        await updateProvider(editing.idProv, form)
        toast.success('Proveedor actualizado')
      } else {
        await addProvider(form)
        toast.success('Proveedor agregado')
      }
      setFormOpen(false)
      setEditing(null)
    } catch (err) {
      toast.error('No se pudo guardar el proveedor', err.message)
    }
  }

  const handleConfirmDelete = async () => {
    try {
      await deleteProvider(toDelete.idProv)
      toast.success('Proveedor eliminado')
    } catch (err) {
      toast.error('No se pudo eliminar el proveedor', err.message)
    } finally {
      setToDelete(null)
    }
  }

  return (
    <div className='container py-5'>
      <div className='admin-page-header mb-4'>
        <h1 className='admin-page-header__title'>🚚 Gestión de Proveedores</h1>
        <p className='admin-page-header__sub'>Administra los proveedores de ComVibes</p>
        <div className='admin-page-header__badges'>
          <span className='admin-badge'>Total: {proveedores.length}</span>
        </div>
      </div>
      <div className='mb-4 d-flex justify-content-end'>
        {!formOpen && (
          <button
            type='button'
            className='btn btn-primary d-flex align-items-center gap-2'
            onClick={handleOpenNew}
          >
            <Plus size={16} /> Nuevo proveedor
          </button>
        )}
      </div>

      {formOpen && (
        <div className='card border-0 shadow-sm rounded-4 p-4 mb-4'>
          <h6 className='fw-bold mb-3'>{editing ? 'Editar proveedor' : 'Nuevo proveedor'}</h6>
          <form onSubmit={handleSubmit}>
            <div className='row'>
              <div className='col-md-6 mb-3'>
                <label htmlFor='nombre' className='form-label'>Nombre / razón social</label>
                <input
                  id='nombre'
                  name='nombre'
                  type='text'
                  className={`form-control ${errors.nombre ? 'is-invalid' : ''}`}
                  value={form.nombre}
                  onChange={handleChange}
                />
                {errors.nombre && <div className='invalid-feedback'>{errors.nombre}</div>}
              </div>

              <div className='col-md-6 mb-3'>
                <label htmlFor='categoria' className='form-label'>Categoría de producto</label>
                <input
                  id='categoria'
                  name='categoria'
                  type='text'
                  className={`form-control ${errors.categoria ? 'is-invalid' : ''}`}
                  placeholder='Marroquinería, ropa, calzado...'
                  value={form.categoria}
                  onChange={handleChange}
                />
                {errors.categoria && <div className='invalid-feedback'>{errors.categoria}</div>}
              </div>

              <div className='col-md-4 mb-3'>
                <label htmlFor='contacto' className='form-label'>Contacto</label>
                <input
                  id='contacto'
                  name='contacto'
                  type='text'
                  className={`form-control ${errors.contacto ? 'is-invalid' : ''}`}
                  value={form.contacto}
                  onChange={handleChange}
                />
                {errors.contacto && <div className='invalid-feedback'>{errors.contacto}</div>}
              </div>

              <div className='col-md-4 mb-3'>
                <label htmlFor='telefono' className='form-label'>Teléfono</label>
                <input
                  id='telefono'
                  name='telefono'
                  type='text'
                  className={`form-control ${errors.telefono ? 'is-invalid' : ''}`}
                  value={form.telefono}
                  onChange={handleChange}
                />
                {errors.telefono && <div className='invalid-feedback'>{errors.telefono}</div>}
              </div>

              <div className='col-md-4 mb-3'>
                <label htmlFor='correo' className='form-label'>Correo</label>
                <input
                  id='correo'
                  name='correo'
                  type='email'
                  className={`form-control ${errors.correo ? 'is-invalid' : ''}`}
                  value={form.correo}
                  onChange={handleChange}
                />
                {errors.correo && <div className='invalid-feedback'>{errors.correo}</div>}
              </div>
            </div>

            <div className='d-flex gap-2'>
              <button type='submit' className='btn btn-primary'>
                {editing ? 'Guardar cambios' : 'Agregar proveedor'}
              </button>
              <button
                type='button'
                className='btn btn-outline-secondary'
                onClick={() => { setFormOpen(false); setEditing(null) }}
              >
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
              aria-label='Buscar proveedores'
            />
          </div>
        </div>

        <div className='table-responsive'>
          <table className='table table-hover mb-0'>
            <thead>
              <tr>
                <th>Proveedor</th>
                <th>Categoría</th>
                <th>Contacto</th>
                <th>Teléfono</th>
                <th>Correo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProveedores.map((proveedor) => (
                <tr key={proveedor.idProv}>
                  <td className='fw-semibold'>{proveedor.nombre}</td>
                  <td>{proveedor.categoria || <span className='text-muted'>—</span>}</td>
                  <td>{proveedor.contacto}</td>
                  <td>{proveedor.telefono}</td>
                  <td>{proveedor.correo}</td>
                  <td>
                    <div className='d-flex gap-1'>
                      <button
                        className='btn btn-sm btn-outline-secondary'
                        onClick={() => handleOpenEdit(proveedor)}
                        aria-label='Editar proveedor'
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        className='btn btn-sm btn-outline-danger'
                        onClick={() => setToDelete(proveedor)}
                        aria-label='Eliminar proveedor'
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredProveedores.length === 0 && (
                <tr>
                  <td colSpan='6' className='text-center text-muted py-5'>
                    <Building2 size={28} className='mb-2 d-block mx-auto' />
                    Sin resultados para "{search}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        show={Boolean(toDelete)}
        title='Eliminar proveedor'
        message={`¿Seguro que deseas eliminar a "${toDelete?.nombre}"? Esta acción no se puede deshacer.`}
        confirmLabel='Eliminar'
        onConfirm={handleConfirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}

export default ProviderManagement
