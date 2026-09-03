import { useState, useRef, useEffect } from 'react'
import { useToast } from '../context/ToastContext'
import { Pencil, Plus, MapPin, Camera, Eye, EyeOff, Lock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import * as usuariosApi from '../api/usuarios'
import { useAddresses } from '../context/AddressesContext'
import { required, isEmail, onlyLetters, onlyNumbers, runValidations } from '../utils/validators'
import Breadcrumbs from '../components/ui/Breadcrumbs'
import AddressForm from '../components/addresses/AddressForm'
import AddressCard from '../components/addresses/AddressCard'
import ConfirmModal from '../components/modals/ConfirmModal'

// La clave incluye el id del usuario para que cada cuenta tenga su propio
// avatar en localStorage y no compartan la imagen entre sesiones distintas.
const avatarKey = (idUsu) => `comvibes_avatar_${idUsu}`

function UserProfile() {
  const toast = useToast()
  const { user, refreshUser } = useAuth()
  const { getByUser, addAddress, updateAddress, deleteAddress, setDefault } = useAddresses()

  // ─── Imagen de perfil ───────────────────────────────────────────────────────
  const fileRef = useRef(null)
  // Se inicializa con la foto del usuario actual (si la tiene guardada).
  const [avatar, setAvatar] = useState(() =>
    user?.idUsu ? localStorage.getItem(avatarKey(user.idUsu)) || null : null
  )

  // Cuando el usuario cambia (login / refresco), cargar su avatar correspondiente.
  useEffect(() => {
    if (user?.idUsu) {
      setAvatar(localStorage.getItem(avatarKey(user.idUsu)) || null)
    } else {
      setAvatar(null)
    }
  }, [user?.idUsu])

  const handleAvatarClick = () => fileRef.current?.click()

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.warning('Imagen demasiado grande', 'Máximo 2 MB')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const base64 = ev.target.result
      localStorage.setItem(avatarKey(user.idUsu), base64)
      setAvatar(base64)
      toast.success('Foto de perfil actualizada')
    }
    reader.readAsDataURL(file)
  }

  // ─── Datos del perfil ───────────────────────────────────────────────────────
  const [form, setForm] = useState({
    nombre:   user?.nombre   || '',
    apellido: user?.apellido || '',
    correo:   user?.correo   || '',
  })
  const [editing, setEditing] = useState(false)
  const [errors, setErrors] = useState({})
  const [savingProfile, setSavingProfile] = useState(false)

  // Sincronizar si user cambia (ej. login)
  useEffect(() => {
    if (user) {
      setForm(prev => ({
        ...prev,
        nombre:   user.nombre   || prev.nombre,
        apellido: user.apellido || prev.apellido,
        correo:   user.correo   || prev.correo,
      }))
    }
  }, [user])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const validate = () =>
    runValidations({
      nombre:   [form.nombre,   [(v) => required(v, 'El nombre'),   (v) => onlyLetters(v, 'El nombre')]],
      apellido: [form.apellido, [(v) => required(v, 'El apellido'), (v) => onlyLetters(v, 'El apellido')]],
    })

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSavingProfile(true)
    try {
      await usuariosApi.actualizarPerfil({ nombre: form.nombre.trim(), apellido: form.apellido.trim() })
      // Actualizar el user en memoria para que el header cambie al instante
      if (refreshUser) await refreshUser()
      toast.success('Perfil actualizado')
      setEditing(false)
    } catch (err) {
      toast.error('No se pudo guardar el perfil', err.message)
    } finally {
      setSavingProfile(false)
    }
  }

  const handleCancelEdit = () => {
    setForm({ nombre: user?.nombre || '', apellido: user?.apellido || '', correo: user?.correo || '' })
    setErrors({})
    setEditing(false)
  }

  // ─── Contraseña ─────────────────────────────────────────────────────────────
  const [pwOpen, setPwOpen] = useState(false)
  const [pwForm, setPwForm] = useState({ passwordActual: '', passwordNueva: '', confirmar: '' })
  const [pwErrors, setPwErrors] = useState({})
  const [savingPw, setSavingPw] = useState(false)
  const [showPw, setShowPw] = useState({ actual: false, nueva: false, confirmar: false })

  const handlePwChange = (e) => {
    const { name, value } = e.target
    setPwForm(prev => ({ ...prev, [name]: value }))
    setPwErrors(prev => ({ ...prev, [name]: '' }))
  }

  const handlePwSubmit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!pwForm.passwordActual)                        errs.passwordActual = 'Ingresa tu contraseña actual'
    if (!pwForm.passwordNueva || pwForm.passwordNueva.length < 8) errs.passwordNueva = 'Mínimo 8 caracteres'
    if (pwForm.passwordNueva !== pwForm.confirmar)     errs.confirmar = 'Las contraseñas no coinciden'
    setPwErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSavingPw(true)
    try {
      await usuariosApi.cambiarPassword(pwForm.passwordActual, pwForm.passwordNueva)
      toast.success('Contraseña actualizada')
      setPwForm({ passwordActual: '', passwordNueva: '', confirmar: '' })
      setPwOpen(false)
    } catch (err) {
      toast.error('No se pudo cambiar la contraseña', err.message)
    } finally {
      setSavingPw(false)
    }
  }

  const closePwForm = () => {
    setPwOpen(false)
    setPwForm({ passwordActual: '', passwordNueva: '', confirmar: '' })
    setPwErrors({})
  }

  // ─── Direcciones ────────────────────────────────────────────────────────────
  const direcciones = getByUser()
  const [addressFormOpen, setAddressFormOpen]   = useState(false)
  const [editingAddress, setEditingAddress]     = useState(null)
  const [addressToDelete, setAddressToDelete]   = useState(null)

  const handleSubmitAddress = async (values) => {
    try {
      if (editingAddress) {
        await updateAddress(editingAddress.idDir, values)
        toast.success('Dirección actualizada')
      } else {
        await addAddress(values)
        toast.success('Dirección agregada')
      }
      setAddressFormOpen(false)
      setEditingAddress(null)
    } catch (err) {
      toast.error('No se pudo guardar la dirección', err.message)
    }
  }

  const handleConfirmDelete = async () => {
    try {
      await deleteAddress(addressToDelete.idDir)
      toast.success('Dirección eliminada')
    } catch (err) {
      toast.error('No se pudo eliminar la dirección', err.message)
    } finally {
      setAddressToDelete(null)
    }
  }

  const handleSetDefault = async (address) => {
    try {
      await setDefault(address.idDir)
    } catch (err) {
      toast.error('No se pudo actualizar', err.message)
    }
  }

  const initials = `${user?.nombre?.[0] || ''}${user?.apellido?.[0] || ''}`.toUpperCase()

  return (
    <div className='container py-5'>
      <Breadcrumbs items={[{ label: 'Mi perfil' }]} />

      <div className='row justify-content-center'>
        <div className='col-md-8'>

          {/* ── Tarjeta de perfil ─────────────────────────────── */}
          <div className='card shadow border-0 rounded-4 p-4 p-md-5 mb-4'>

            {/* Avatar + nombre */}
            <div className='d-flex align-items-center gap-4 mb-4 pb-4 border-bottom'>
              {/* Foto de perfil clickeable */}
              <div className='position-relative' style={{ flexShrink: 0 }}>
                <div
                  className='profile-avatar'
                  style={{
                    width: 80, height: 80, fontSize: '1.6rem', cursor: 'pointer',
                    backgroundImage: avatar ? `url(${avatar})` : undefined,
                    backgroundSize: 'cover', backgroundPosition: 'center',
                    overflow: 'hidden',
                  }}
                  onClick={handleAvatarClick}
                  title='Cambiar foto de perfil'
                  role='button'
                  aria-label='Cambiar foto de perfil'
                >
                  {!avatar && initials}
                </div>
                {/* Botón de cámara superpuesto */}
                <button
                  type='button'
                  className='btn btn-primary btn-sm rounded-circle d-flex align-items-center justify-content-center'
                  style={{
                    position: 'absolute', bottom: 0, right: 0,
                    width: 26, height: 26, padding: 0,
                    border: '2px solid #fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                  }}
                  onClick={handleAvatarClick}
                  aria-label='Cambiar foto'
                >
                  <Camera size={12} />
                </button>
                <input
                  ref={fileRef}
                  type='file'
                  accept='image/jpeg,image/png,image/webp'
                  className='d-none'
                  onChange={handleAvatarChange}
                />
              </div>

              <div>
                <h2 className='fw-bold mb-0'>{user?.nombre} {user?.apellido}</h2>
                <p className='text-muted mb-0'>{user?.correo}</p>
                <span className='badge bg-primary-subtle text-primary mt-1 text-capitalize'>
                  {user?.rol}
                </span>
              </div>
            </div>

            {/* Formulario de datos */}
            <form onSubmit={handleSubmit} noValidate>
              <div className='row'>
                {[
                  { name: 'nombre',   label: 'Nombre',   placeholder: 'Tu nombre' },
                  { name: 'apellido', label: 'Apellido', placeholder: 'Tu apellido' },
                ].map(f => (
                  <div className='col-md-6 mb-3' key={f.name}>
                    <label htmlFor={f.name} className='form-label'>{f.label}</label>
                    <input
                      id={f.name} name={f.name} type='text'
                      className={`form-control ${errors[f.name] ? 'is-invalid' : ''}`}
                      value={form[f.name]}
                      onChange={handleChange}
                      readOnly={!editing}
                      placeholder={f.placeholder}
                    />
                    {errors[f.name] && <div className='invalid-feedback'>{errors[f.name]}</div>}
                  </div>
                ))}

                <div className='col-md-6 mb-3'>
                  <label htmlFor='correo' className='form-label'>Correo electrónico</label>
                  <input
                    id='correo' name='correo' type='email'
                    className='form-control'
                    value={form.correo}
                    readOnly
                    style={{ background: '#f8f9fa', cursor: 'not-allowed' }}
                    title='El correo no se puede cambiar desde aquí'
                  />
                  <div className='form-text'>El correo no se puede modificar.</div>
                </div>
              </div>

              {editing ? (
                <div className='d-flex gap-2 mt-2'>
                  <button type='submit' className='btn btn-primary' disabled={savingProfile}>
                    {savingProfile ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                  <button type='button' className='btn btn-outline-secondary' onClick={handleCancelEdit}>
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type='button'
                  className='btn btn-outline-primary mt-2 d-flex align-items-center gap-2'
                  onClick={() => setEditing(true)}
                >
                  <Pencil size={15} /> Editar datos
                </button>
              )}
            </form>
          </div>

          {/* ── Cambio de contraseña ──────────────────────────── */}
          <div className='card shadow border-0 rounded-4 p-4 mb-4'>
            <div className='d-flex justify-content-between align-items-center mb-3'>
              <h5 className='fw-bold mb-0 d-flex align-items-center gap-2'>
                <Lock size={17} className='text-primary' /> Contraseña
              </h5>
              {!pwOpen && (
                <button className='btn btn-outline-primary btn-sm' onClick={() => setPwOpen(true)}>
                  Cambiar contraseña
                </button>
              )}
            </div>

            {pwOpen && (
              <form onSubmit={handlePwSubmit} noValidate>
                <div className='row'>
                  {[
                    { name: 'passwordActual', label: 'Contraseña actual',        key: 'actual',   auto: 'current-password' },
                    { name: 'passwordNueva',  label: 'Nueva contraseña',         key: 'nueva',    auto: 'new-password', hint: 'Mínimo 8 caracteres' },
                    { name: 'confirmar',      label: 'Confirmar nueva contraseña', key: 'confirmar', auto: 'new-password' },
                  ].map(f => (
                    <div className='col-md-6 mb-3' key={f.name}>
                      <label className='form-label'>{f.label}</label>
                      <div className='input-group'>
                        <input
                          type={showPw[f.key] ? 'text' : 'password'}
                          name={f.name}
                          className={`form-control ${pwErrors[f.name] ? 'is-invalid' : ''}`}
                          value={pwForm[f.name]}
                          onChange={handlePwChange}
                          autoComplete={f.auto}
                          placeholder={f.hint || ''}
                        />
                        <button
                          type='button'
                          className='btn btn-outline-secondary'
                          onClick={() => setShowPw(prev => ({ ...prev, [f.key]: !prev[f.key] }))}
                          tabIndex={-1}
                          aria-label={showPw[f.key] ? 'Ocultar' : 'Mostrar'}
                        >
                          {showPw[f.key] ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                        {pwErrors[f.name] && <div className='invalid-feedback'>{pwErrors[f.name]}</div>}
                      </div>
                    </div>
                  ))}
                </div>
                <div className='d-flex gap-2'>
                  <button type='submit' className='btn btn-primary btn-sm' disabled={savingPw}>
                    {savingPw ? 'Guardando...' : 'Actualizar contraseña'}
                  </button>
                  <button type='button' className='btn btn-outline-secondary btn-sm' onClick={closePwForm}>
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* ── Libreta de direcciones ───────────────────────── */}
          <div className='card shadow border-0 rounded-4 p-4'>
            <div className='d-flex justify-content-between align-items-center mb-4'>
              <h5 className='fw-bold mb-0 d-flex align-items-center gap-2'>
                <MapPin size={17} className='text-primary' /> Mis direcciones
              </h5>
              {!addressFormOpen && (
                <button
                  type='button'
                  className='btn btn-primary btn-sm d-flex align-items-center gap-1'
                  onClick={() => { setEditingAddress(null); setAddressFormOpen(true) }}
                >
                  <Plus size={14} /> Agregar dirección
                </button>
              )}
            </div>

            {addressFormOpen && (
              <div className='border rounded-4 p-3 p-md-4 mb-4 bg-light'>
                <h6 className='fw-semibold mb-3'>
                  {editingAddress ? '✏️ Editar dirección' : '📍 Nueva dirección'}
                </h6>
                <AddressForm
                  initialValues={editingAddress || {}}
                  submitLabel={editingAddress ? 'Guardar cambios' : 'Agregar dirección'}
                  onSubmit={handleSubmitAddress}
                  onCancel={() => { setAddressFormOpen(false); setEditingAddress(null) }}
                />
              </div>
            )}

            {direcciones.length === 0 && !addressFormOpen ? (
              <p className='text-muted mb-0'>Aún no tienes direcciones guardadas.</p>
            ) : (
              <div className='row g-3'>
                {direcciones.map(address => (
                  <div className='col-md-6' key={address.idDir}>
                    <AddressCard
                      address={address}
                      mode='manage'
                      onEdit={(a) => { setEditingAddress(a); setAddressFormOpen(true) }}
                      onDelete={setAddressToDelete}
                      onSetDefault={handleSetDefault}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      <ConfirmModal
        show={Boolean(addressToDelete)}
        title='Eliminar dirección'
        message={`¿Seguro que deseas eliminar "${addressToDelete?.etiqueta}"?`}
        confirmLabel='Eliminar'
        onConfirm={handleConfirmDelete}
        onCancel={() => setAddressToDelete(null)}
      />
    </div>
  )
}

export default UserProfile
