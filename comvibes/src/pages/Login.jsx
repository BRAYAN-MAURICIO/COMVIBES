import { useState } from 'react'
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom'
import Swal from 'sweetalert2'
import { Mail, Lock } from 'lucide-react'
import AuthLayout from '../components/layout/AuthLayout'
import { useAuth } from '../context/AuthContext'
import { required, isEmail, runValidations } from '../utils/validators'

function Login() {
  const { login } = useAuth()
  const [searchParams] = useSearchParams()
  const sessionExpired = searchParams.get('expired') === '1'
  const navigate = useNavigate()
  const location = useLocation()

  const [form, setForm] = useState({ correo: '', password: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const validate = () =>
    runValidations({
      correo: [form.correo, [(v) => required(v, 'El correo'), isEmail]],
      password: [form.password, [(v) => required(v, 'La contraseña')]],
    })

  const handleSubmit = async (e) => {
    e.preventDefault()

    const validationErrors = validate()
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setLoading(true)
    try {
      await login(form.correo, form.password)
      await Swal.fire({
        icon: 'success',
        title: 'Bienvenido de nuevo',
        timer: 1400,
        showConfirmButton: false,
      })
      const redirectTo = searchParams.get('redirect') || location.state?.from || '/'
      navigate(redirectTo, { replace: true })
    } catch (err) {
      // El backend responde 403 con details.requiereVerificacion cuando las
      // credenciales son correctas pero la cuenta nunca se activó.
      if (err.details?.requiereVerificacion) {
        const { isConfirmed } = await Swal.fire({
          icon: 'info',
          title: 'Falta verificar tu correo',
          text: err.message,
          showCancelButton: true,
          confirmButtonText: 'Ingresar el código',
          cancelButtonText: 'Ahora no',
        })
        if (isConfirmed) {
          navigate('/verificar-correo', { state: { correo: form.correo } })
        }
        return
      }
      Swal.fire({ icon: 'error', title: 'No se pudo iniciar sesión', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title='Iniciar sesión' subtitle='Ingresa tus datos para continuar comprando'>
      {sessionExpired && (
        <div className='alert alert-warning py-2 mb-3 small d-flex align-items-center gap-2' role='alert'>
          <span>⏱️</span>
          <span>Tu sesión expiró. Ingresa de nuevo para continuar.</span>
        </div>
      )}
      <form onSubmit={handleSubmit} noValidate>
        <div className='mb-3'>
          <label htmlFor='correo' className='form-label'>Correo</label>
          <div className='input-icon'>
            <Mail size={16} className='input-icon__glyph' />
            <input
              id='correo'
              name='correo'
              type='email'
              className={`form-control ${errors.correo ? 'is-invalid' : ''}`}
              placeholder='tucorreo@ejemplo.com'
              value={form.correo}
              onChange={handleChange}
              autoComplete='email'
            />
          </div>
          {errors.correo && <div className='invalid-feedback d-block'>{errors.correo}</div>}
        </div>

        <div className='mb-3'>
          <div className='d-flex justify-content-between align-items-center'>
            <label htmlFor='password' className='form-label mb-0'>Contraseña</label>
            <Link to='/recuperar-contrasena' className='small text-decoration-none'>
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <div className='input-icon mt-1'>
            <Lock size={16} className='input-icon__glyph' />
            <input
              id='password'
              name='password'
              type='password'
              className={`form-control ${errors.password ? 'is-invalid' : ''}`}
              placeholder='••••••••'
              value={form.password}
              onChange={handleChange}
              autoComplete='current-password'
            />
          </div>
          {errors.password && <div className='invalid-feedback d-block'>{errors.password}</div>}
        </div>

        <button type='submit' className='btn btn-primary w-100 mt-2' disabled={loading}>
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>

        <p className='text-center mt-4 mb-0'>
          ¿No tienes cuenta? <Link to='/registro' className='fw-semibold'>Regístrate aquí</Link>
        </p>
      </form>
    </AuthLayout>
  )
}

export default Login