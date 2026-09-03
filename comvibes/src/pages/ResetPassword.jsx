import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import Swal from 'sweetalert2'
import { ShieldCheck, Lock } from 'lucide-react'
import AuthLayout from '../components/layout/AuthLayout'
import { useAuth } from '../context/AuthContext'
import { required, minLength, matches, isEmail, runValidations } from '../utils/validators'

function ResetPassword() {
  const { resetPassword } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [correo, setCorreo] = useState(location.state?.correo || '')
  const [form, setForm] = useState({ code: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const validate = () =>
    runValidations({
      ...(!location.state?.correo && {
        correo: [correo, [(v) => required(v, 'El correo'), isEmail]],
      }),
      code: [form.code, [(v) => required(v, 'El código'), (v) => minLength(v, 6, 'El código')]],
      password: [
        form.password,
        [(v) => required(v, 'La nueva contraseña'), (v) => minLength(v, 8, 'La nueva contraseña')],
      ],
      confirmPassword: [
        form.confirmPassword,
        [
          (v) => required(v, 'La confirmación'),
          (v) => matches(v, form.password, 'Las contraseñas'),
        ],
      ],
    })

  const handleSubmit = async (e) => {
    e.preventDefault()

    const validationErrors = validate()
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setLoading(true)
    try {
      // La validación del código la hace el backend (BD, no localStorage)
      await resetPassword(correo, form.code, form.password)
      await Swal.fire({
        icon: 'success',
        title: 'Contraseña actualizada',
        text: 'Ya puedes iniciar sesión con tu nueva contraseña',
        timer: 1800,
        showConfirmButton: false,
      })
      navigate('/login', { replace: true })
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'No se pudo restablecer la contraseña',
        text: err.message,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title='Restablecer contraseña'
      subtitle='Ingresa el código que recibiste y tu nueva contraseña'
    >
      <form onSubmit={handleSubmit} noValidate>
        {!location.state?.correo && (
          <div className='mb-3'>
            <label htmlFor='correo' className='form-label'>Correo</label>
            <input
              id='correo'
              type='email'
              className={`form-control ${errors.correo ? 'is-invalid' : ''}`}
              value={correo}
              onChange={(e) => { setCorreo(e.target.value); setErrors((p) => ({ ...p, correo: '' })) }}
              autoComplete='email'
            />
            {errors.correo && <div className='invalid-feedback'>{errors.correo}</div>}
          </div>
        )}

        <div className='mb-3'>
          <label htmlFor='code' className='form-label'>Código de verificación</label>
          <div className='input-icon'>
            <ShieldCheck size={16} className='input-icon__glyph' />
            <input
              id='code'
              name='code'
              type='text'
              inputMode='numeric'
              maxLength={6}
              className={`form-control ${errors.code ? 'is-invalid' : ''}`}
              placeholder='123456'
              value={form.code}
              onChange={handleChange}
            />
          </div>
          {errors.code && <div className='invalid-feedback d-block'>{errors.code}</div>}
        </div>

        <div className='mb-3'>
          <label htmlFor='password' className='form-label'>Nueva contraseña</label>
          <div className='input-icon'>
            <Lock size={16} className='input-icon__glyph' />
            <input
              id='password'
              name='password'
              type='password'
              className={`form-control ${errors.password ? 'is-invalid' : ''}`}
              placeholder='Mínimo 8 caracteres'
              value={form.password}
              onChange={handleChange}
              autoComplete='new-password'
            />
          </div>
          {errors.password && <div className='invalid-feedback d-block'>{errors.password}</div>}
        </div>

        <div className='mb-1'>
          <label htmlFor='confirmPassword' className='form-label'>Confirmar contraseña</label>
          <div className='input-icon'>
            <Lock size={16} className='input-icon__glyph' />
            <input
              id='confirmPassword'
              name='confirmPassword'
              type='password'
              className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
              value={form.confirmPassword}
              onChange={handleChange}
              autoComplete='new-password'
            />
          </div>
          {errors.confirmPassword && (
            <div className='invalid-feedback d-block'>{errors.confirmPassword}</div>
          )}
        </div>

        <button type='submit' className='btn btn-primary w-100 mt-3' disabled={loading}>
          {loading ? 'Guardando...' : 'Restablecer contraseña'}
        </button>

        <p className='text-center mt-4 mb-0'>
          <Link to='/recuperar-contrasena' className='fw-semibold'>
            ¿No recibiste el código?
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}

export default ResetPassword
