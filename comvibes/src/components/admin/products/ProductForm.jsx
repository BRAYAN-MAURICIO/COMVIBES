import { PackagePlus, FolderPlus, Truck } from 'lucide-react'
import QuickCreateField from './QuickCreateField'
import ImageUploader from './ImageUploader'

// Input de Bootstrap con su label y el mensaje de validación.
function Campo({ id, label, value, onChange, error, type = 'text', col = 'col-md-4', placeholder }) {
  return (
    <div className={`${col} mb-3`}>
      <label htmlFor={id} className='form-label'>{label}</label>
      <input
        id={id}
        name={id}
        type={type}
        className={`form-control ${error ? 'is-invalid' : ''}`}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
      {error && <div className='invalid-feedback'>{error}</div>}
    </div>
  )
}

// Formulario de creación / edición de producto. No guarda estado propio del
// producto: todo llega por props desde ProductManagement, que es quien valida
// y envía al API. Aquí solo se compone la vista.
function ProductForm({
  form,
  errors,
  isEditing,
  categorias,
  proveedores,
  galeria,
  onChange,
  onGaleriaChange,
  onCreateCategoria,
  onCreateProveedor,
  onSubmit,
  onCancel,
}) {
  return (
    <div className='card shadow border-0 rounded-4 p-4 mb-4'>
      <div className='d-flex align-items-center gap-2 mb-3'>
        <div className='icon-badge icon-badge--blue'>
          <PackagePlus size={20} />
        </div>
        <h5 className='fw-bold mb-0'>{isEditing ? 'Editar producto' : 'Nuevo producto'}</h5>
      </div>

      <form onSubmit={onSubmit} noValidate>
        <div className='row'>
          <Campo id='nombre' label='Nombre' col='col-md-6' value={form.nombre} onChange={onChange} error={errors.nombre} />

          <div className='col-md-6 mb-3'>
            <QuickCreateField
              id='idCat'
              label='Categoría'
              icon={FolderPlus}
              toggleText='Nueva'
              placeholder='Nombre de la nueva categoría'
              onCreate={onCreateCategoria}
            >
              <select
                id='idCat'
                name='idCat'
                className={`form-select ${errors.idCat ? 'is-invalid' : ''}`}
                value={form.idCat}
                onChange={onChange}
              >
                <option value=''>Selecciona una categoría</option>
                {categorias.map((cat) => (
                  <option key={cat.idCat} value={cat.idCat}>{cat.nombre}</option>
                ))}
              </select>
              {errors.idCat && <div className='invalid-feedback'>{errors.idCat}</div>}
            </QuickCreateField>
          </div>

          <div className='col-md-6 mb-3'>
            <QuickCreateField
              id='idProv'
              label={<>Proveedor <span className='text-muted small'>(opcional)</span></>}
              icon={Truck}
              toggleText='Nuevo'
              placeholder='Nombre del nuevo proveedor'
              onCreate={onCreateProveedor}
            >
              <select id='idProv' name='idProv' className='form-select' value={form.idProv} onChange={onChange}>
                <option value=''>Sin proveedor asignado</option>
                {proveedores.map((prov) => (
                  <option key={prov.idProv} value={prov.idProv}>{prov.nombre}</option>
                ))}
              </select>
            </QuickCreateField>
          </div>

          <Campo id='precio' label='Precio' type='number' value={form.precio} onChange={onChange} error={errors.precio} />
          <Campo id='stock' label='Inventario' type='number' value={form.stock} onChange={onChange} error={errors.stock} />
          <Campo id='marca' label='Marca' value={form.marca} onChange={onChange} placeholder='Ej: ComVibes Leather' />
          <Campo id='color' label='Color' value={form.color} onChange={onChange} placeholder='Ej: Negro' />
          <Campo id='talla' label='Talla' value={form.talla} onChange={onChange} placeholder='Ej: S - XL (dejar vacío si no aplica)' />

          <ImageUploader galeria={galeria} onGaleriaChange={onGaleriaChange} />

          <div className='col-12 mb-3'>
            <label htmlFor='descripcion' className='form-label'>Descripción</label>
            <textarea
              id='descripcion'
              name='descripcion'
              className='form-control'
              rows='3'
              value={form.descripcion}
              onChange={onChange}
            />
          </div>
        </div>

        <div className='d-flex gap-2'>
          <button type='submit' className='btn btn-primary'>
            {isEditing ? 'Guardar cambios' : 'Crear producto'}
          </button>
          <button type='button' className='btn btn-outline-secondary' onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}

export default ProductForm
