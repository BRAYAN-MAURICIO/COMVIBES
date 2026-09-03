import { useState, useEffect } from 'react'
import { required, onlyNumbers, runValidations } from '../../utils/validators'
import { DEPARTAMENTOS, getMunicipios } from '../../data/colombia'

const emptyForm = {
  etiqueta: '',
  direccion: '',
  departamento: '',
  ciudad: '',
  telefono: '',
  predeterminada: false,
}

function AddressForm({ initialValues = {}, onSubmit, onCancel, submitLabel = 'Guardar dirección', hidePredeterminada = false }) {
  const [form, setForm] = useState({ ...emptyForm, ...initialValues })
  const [errors, setErrors] = useState({})
  const [municipios, setMunicipios] = useState([])

  // Cuando cambia el departamento, actualizar municipios y resetear ciudad
  useEffect(() => {
    if (form.departamento) {
      const lista = getMunicipios(form.departamento)
      setMunicipios(lista)
      // Solo resetear ciudad si cambió el departamento (no en la carga inicial)
      if (!initialValues.departamento || initialValues.departamento !== form.departamento) {
        setForm(prev => ({ ...prev, ciudad: lista[0] || '' }))
      }
    } else {
      setMunicipios([])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.departamento])

  // Cargar municipios iniciales si ya viene un departamento (editar)
  useEffect(() => {
    if (initialValues.departamento) {
      setMunicipios(getMunicipios(initialValues.departamento))
    }
  }, [initialValues.departamento])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const validate = () =>
    runValidations({
      etiqueta:     [form.etiqueta,     [(v) => required(v, 'La etiqueta')]],
      direccion:    [form.direccion,    [(v) => required(v, 'La dirección')]],
      departamento: [form.departamento, [(v) => required(v, 'El departamento')]],
      ciudad:       [form.ciudad,       [(v) => required(v, 'El municipio')]],
      telefono:     [form.telefono,     [(v) => required(v, 'El teléfono'), (v) => onlyNumbers(v, 'El teléfono')]],
    })

  const handleSubmit = () => {
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    onSubmit(form)
  }

  const depActual = DEPARTAMENTOS.find(d => d.id === form.departamento)

  return (
    <div>
      <div className='row'>

        {/* Etiqueta */}
        <div className='col-md-6 mb-3'>
          <label htmlFor='etiqueta' className='form-label'>Etiqueta</label>
          <input
            id='etiqueta' name='etiqueta' type='text'
            className={`form-control ${errors.etiqueta ? 'is-invalid' : ''}`}
            placeholder='Casa, Trabajo, Otro...'
            value={form.etiqueta} onChange={handleChange}
          />
          {errors.etiqueta && <div className='invalid-feedback'>{errors.etiqueta}</div>}
        </div>

        {/* Teléfono */}
        <div className='col-md-6 mb-3'>
          <label htmlFor='telefono' className='form-label'>Teléfono de contacto</label>
          <input
            id='telefono' name='telefono' type='text'
            className={`form-control ${errors.telefono ? 'is-invalid' : ''}`}
            placeholder='3001234567'
            value={form.telefono} onChange={handleChange}
          />
          {errors.telefono && <div className='invalid-feedback'>{errors.telefono}</div>}
        </div>

        {/* Dirección completa */}
        <div className='col-12 mb-3'>
          <label htmlFor='direccion' className='form-label'>Dirección</label>
          <input
            id='direccion' name='direccion' type='text'
            className={`form-control ${errors.direccion ? 'is-invalid' : ''}`}
            placeholder='Cra 10 # 20-30, Apto 501'
            value={form.direccion} onChange={handleChange}
          />
          {errors.direccion && <div className='invalid-feedback'>{errors.direccion}</div>}
        </div>

        {/* Departamento */}
        <div className='col-md-6 mb-3'>
          <label htmlFor='departamento' className='form-label'>Departamento</label>
          <select
            id='departamento' name='departamento'
            className={`form-select ${errors.departamento ? 'is-invalid' : ''}`}
            value={form.departamento} onChange={handleChange}
          >
            <option value=''>Selecciona un departamento</option>
            {DEPARTAMENTOS.map(d => (
              <option key={d.id} value={d.id}>{d.nombre}</option>
            ))}
          </select>
          {errors.departamento && <div className='invalid-feedback'>{errors.departamento}</div>}
        </div>

        {/* Municipio — se habilita después de elegir departamento */}
        <div className='col-md-6 mb-3'>
          <label htmlFor='ciudad' className='form-label'>
            Municipio
            {depActual && (
              <span className='text-muted small ms-1'>— {depActual.nombre}</span>
            )}
          </label>
          <select
            id='ciudad' name='ciudad'
            className={`form-select ${errors.ciudad ? 'is-invalid' : ''}`}
            value={form.ciudad} onChange={handleChange}
            disabled={municipios.length === 0}
          >
            <option value=''>
              {municipios.length === 0 ? 'Primero elige un departamento' : 'Selecciona un municipio'}
            </option>
            {municipios.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          {errors.ciudad && <div className='invalid-feedback'>{errors.ciudad}</div>}
        </div>

        {/* Predeterminada */}
        {!hidePredeterminada && (
          <div className='col-12 mb-3'>
            <div className='form-check'>
              <input
                id='predeterminada' name='predeterminada' type='checkbox'
                className='form-check-input'
                checked={form.predeterminada} onChange={handleChange}
              />
              <label htmlFor='predeterminada' className='form-check-label'>
                Usar como dirección predeterminada
              </label>
            </div>
          </div>
        )}
      </div>

      <div className='d-flex gap-2 mt-2'>
        <button type='button' className='btn btn-primary' onClick={handleSubmit}>{submitLabel}</button>
        {onCancel && (
          <button type='button' className='btn btn-outline-secondary' onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>
    </div>
  )
}

export default AddressForm
