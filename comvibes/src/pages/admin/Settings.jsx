import { useState, useEffect } from 'react'
import { useToast } from '../../context/ToastContext'
import { Store, CreditCard, Share2, Pencil } from 'lucide-react'
import { required, isEmail, onlyNumbers, runValidations } from '../../utils/validators'
import { useMetodosPago } from '../../context/MetodosPagoContext'

const initialGeneral = {
  nombreTienda: 'COMVIBES',
  correoSoporte: 'soporte@comvibes.com',
  telefono: '3001234567',
  direccion: 'Occidente del Huila, Colombia',
}

const initialRedes = {
  facebook: '',
  instagram: '',
  whatsapp: '3001234567',
}

function Settings() {
  const toast = useToast()
  const { metodos, toggleMetodo } = useMetodosPago()
  const [general, setGeneral] = useState(() => {
    try { return JSON.parse(localStorage.getItem('comvibes_settings_general')) || initialGeneral }
    catch { return initialGeneral }
  })
  const [redes, setRedes] = useState(() => {
    try { return JSON.parse(localStorage.getItem('comvibes_settings_redes')) || initialRedes }
    catch { return initialRedes }
  })
  const [editingGeneral, setEditingGeneral] = useState(false)
  const [editingRedes, setEditingRedes] = useState(false)
  const [errors, setErrors] = useState({})

  const handleGeneralChange = (e) => {
    const { name, value } = e.target
    setGeneral((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const handleRedesChange = (e) => {
    const { name, value } = e.target
    setRedes((prev) => ({ ...prev, [name]: value }))
  }

  const handleSaveGeneral = (e) => {
    e.preventDefault()

    const validationErrors = runValidations({
      nombreTienda: [general.nombreTienda, [(v) => required(v, 'El nombre de la tienda')]],
      correoSoporte: [general.correoSoporte, [(v) => required(v, 'El correo'), isEmail]],
      telefono: [general.telefono, [(v) => (v ? onlyNumbers(v, 'El teléfono') : '')]],
    })
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    localStorage.setItem('comvibes_settings_general', JSON.stringify(general))
    toast.success('Información general guardada')
    setEditingGeneral(false)
  }

  const handleSaveRedes = (e) => {
    e.preventDefault()
    localStorage.setItem('comvibes_settings_redes', JSON.stringify(redes))
    toast.success('Redes sociales guardadas')
    setEditingRedes(false)
  }

  const handleToggleMetodo = (metodo) => {
    toggleMetodo(metodo.idMet, !metodo.activo)
      .then(() => toast.success('Métodos de pago actualizados'))
      .catch((err) => toast.error('No se pudo actualizar', err.message))
  }

  return (
    <div className='container py-5'>
      <div className='admin-page-header mb-4'>
        <h1 className='admin-page-header__title'>⚙️ Configuración del Sistema</h1>
        <p className='admin-page-header__sub'>Administra la información general y las opciones de la tienda</p>
        <div className='admin-page-header__badges'>
          <span className='admin-badge'>🟢 Configuración activa</span>
          <span className='admin-badge'>🔒 Solo administradores</span>
        </div>
      </div>

      <div className='row g-4'>
        <div className='col-lg-7'>
          {/* --- Información general --- */}
          <div className='card shadow-sm border-0 rounded-4 p-4 mb-4'>
            <div className='d-flex align-items-center gap-2 mb-4'>
              <div className='icon-badge icon-badge--blue'>
                <Store size={20} />
              </div>
              <h5 className='fw-bold mb-0'>Información general</h5>
            </div>

            <form onSubmit={handleSaveGeneral} noValidate>
              <div className='row'>
                <div className='col-md-6 mb-3'>
                  <label htmlFor='nombreTienda' className='form-label'>Nombre de la tienda</label>
                  <input
                    id='nombreTienda'
                    name='nombreTienda'
                    className={`form-control ${errors.nombreTienda ? 'is-invalid' : ''}`}
                    value={general.nombreTienda}
                    onChange={handleGeneralChange}
                    readOnly={!editingGeneral}
                  />
                  {errors.nombreTienda && <div className='invalid-feedback'>{errors.nombreTienda}</div>}
                </div>

                <div className='col-md-6 mb-3'>
                  <label htmlFor='correoSoporte' className='form-label'>Correo soporte</label>
                  <input
                    id='correoSoporte'
                    name='correoSoporte'
                    type='email'
                    className={`form-control ${errors.correoSoporte ? 'is-invalid' : ''}`}
                    value={general.correoSoporte}
                    onChange={handleGeneralChange}
                    readOnly={!editingGeneral}
                  />
                  {errors.correoSoporte && <div className='invalid-feedback'>{errors.correoSoporte}</div>}
                </div>

                <div className='col-md-6 mb-3'>
                  <label htmlFor='telefono' className='form-label'>Teléfono</label>
                  <input
                    id='telefono'
                    name='telefono'
                    className={`form-control ${errors.telefono ? 'is-invalid' : ''}`}
                    value={general.telefono}
                    onChange={handleGeneralChange}
                    readOnly={!editingGeneral}
                  />
                  {errors.telefono && <div className='invalid-feedback'>{errors.telefono}</div>}
                </div>

                <div className='col-md-6 mb-3'>
                  <label htmlFor='direccion' className='form-label'>Dirección</label>
                  <input
                    id='direccion'
                    name='direccion'
                    className='form-control'
                    value={general.direccion}
                    onChange={handleGeneralChange}
                    readOnly={!editingGeneral}
                  />
                </div>
              </div>

              {editingGeneral ? (
                <div className='d-flex gap-2'>
                  <button type='submit' className='btn btn-primary'>Guardar Cambios</button>
                  <button
                    type='button'
                    className='btn btn-outline-secondary'
                    onClick={() => { try { setGeneral(JSON.parse(localStorage.getItem('comvibes_settings_general')) || initialGeneral) } catch { setGeneral(initialGeneral) } setErrors({}); setEditingGeneral(false) }}
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type='button'
                  className='btn btn-primary d-flex align-items-center gap-2'
                  onClick={() => setEditingGeneral(true)}
                >
                  <Pencil size={16} /> Editar información
                </button>
              )}
            </form>
          </div>

          {/* --- Redes sociales --- */}
          <div className='card shadow-sm border-0 rounded-4 p-4'>
            <div className='d-flex align-items-center gap-2 mb-4'>
              <div className='icon-badge icon-badge--purple'>
                <Share2 size={20} />
              </div>
              <h5 className='fw-bold mb-0'>Redes sociales y contacto</h5>
            </div>

            <form onSubmit={handleSaveRedes}>
              <div className='row'>
                <div className='col-md-6 mb-3'>
                  <label htmlFor='facebook' className='form-label'>Facebook</label>
                  <input
                    id='facebook'
                    name='facebook'
                    className='form-control'
                    placeholder='facebook.com/comvibes'
                    value={redes.facebook}
                    onChange={handleRedesChange}
                    readOnly={!editingRedes}
                  />
                </div>

                <div className='col-md-6 mb-3'>
                  <label htmlFor='instagram' className='form-label'>Instagram</label>
                  <input
                    id='instagram'
                    name='instagram'
                    className='form-control'
                    placeholder='@comvibes'
                    value={redes.instagram}
                    onChange={handleRedesChange}
                    readOnly={!editingRedes}
                  />
                </div>

                <div className='col-md-6 mb-3'>
                  <label htmlFor='whatsapp' className='form-label'>WhatsApp</label>
                  <input
                    id='whatsapp'
                    name='whatsapp'
                    className='form-control'
                    value={redes.whatsapp}
                    onChange={handleRedesChange}
                    readOnly={!editingRedes}
                  />
                </div>
              </div>

              {editingRedes ? (
                <div className='d-flex gap-2'>
                  <button type='submit' className='btn btn-primary'>Guardar Cambios</button>
                  <button
                    type='button'
                    className='btn btn-outline-secondary'
                    onClick={() => { try { setRedes(JSON.parse(localStorage.getItem('comvibes_settings_redes')) || initialRedes) } catch { setRedes(initialRedes) } setEditingRedes(false) }}
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type='button'
                  className='btn btn-primary d-flex align-items-center gap-2'
                  onClick={() => setEditingRedes(true)}
                >
                  <Pencil size={16} /> Editar redes
                </button>
              )}
            </form>
          </div>
        </div>

        <div className='col-lg-5'>
          {/* --- Métodos de pago --- */}
          <div className='card shadow-sm border-0 rounded-4 p-4'>
            <div className='d-flex align-items-center gap-2 mb-4'>
              <div className='icon-badge icon-badge--teal'>
                <CreditCard size={20} />
              </div>
              <h5 className='fw-bold mb-0'>Métodos de pago</h5>
            </div>

            <p className='text-muted small mb-3'>
              Activa o desactiva los métodos disponibles en el checkout de tus clientes.
            </p>

            <div className='d-flex flex-column gap-3'>
              {metodos.map((metodo) => (
                <div key={metodo.idMet} className='d-flex justify-content-between align-items-center'>
                  <div>
                    <div className='fw-semibold'>{metodo.nombre}</div>
                    <small className='text-muted'>{metodo.descripcion}</small>
                  </div>
                  <div className='form-check form-switch mb-0'>
                    <input
                      className='form-check-input'
                      type='checkbox'
                      role='switch'
                      checked={metodo.activo}
                      onChange={() => handleToggleMetodo(metodo)}
                      aria-label={`Activar/desactivar ${metodo.nombre}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
