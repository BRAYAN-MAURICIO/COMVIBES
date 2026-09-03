import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Swal from 'sweetalert2'
import { Mail, KeyRound } from 'lucide-react'
import AuthLayout from '../components/layout/AuthLayout'
import { useAuth } from '../context/AuthContext'
import { required, isEmail, runValidations } from '../utils/validators'

function ForgotPassword() {
  const { requestPasswordReset } = useAuth()
  const navigate = useNavigate()

  const [correo, setCorreo] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    const validationErrors = runValidations({
      correo: [correo, [(v) => required(v, 'El correo'), isEmail]],
    })
    if (validationErrors.correo) {
      setError(validationErrors.correo)
      return
    }
    setError('')

    setLoading(true)
    try {
      // El backend guarda solo el hash del código (válido 10 min) y envía el
      // código en claro únicamente al correo del usuario.
      await requestPasswordReset(correo)

      await Swal.fire({
        icon: 'success',
        title: 'Correo enviado',
        html: 'Si el correo está registrado, recibirás un código de 6 dígitos en tu bandeja.<br><span class="small text-muted">Revisa también la carpeta de spam.</span>',
        confirmButtonText: 'Continuar',
      })

      navigate('/restablecer-contrasena', { state: { correo } })
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'No se pudo procesar la solicitud', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title='Recuperar contraseña'
      subtitle='Te enviaremos un código de verificación a tu correo'
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className='mb-3'>
          <label htmlFor='correo' className='form-label'>Correo</label>
          <div className='input-icon'>
            <Mail size={16} className='input-icon__glyph' />
            <input
              id='correo'
              type='email'
              className={`form-control ${error ? 'is-invalid' : ''}`}
              placeholder='tucorreo@ejemplo.com'
              value={correo}
              onChange={(e) => { setCorreo(e.target.value); setError('') }}
              autoComplete='email'
            />
          </div>
          {error && <div className='invalid-feedback d-block'>{error}</div>}
        </div>

        <button
          type='submit'
          className='btn btn-primary w-100 mt-2 d-flex align-items-center justify-content-center gap-2'
          disabled={loading}
        >
          <KeyRound size={16} />
          {loading ? 'Procesando...' : 'Enviar código'}
        </button>

        <p className='text-center mt-4 mb-0'>
          <Link to='/login' className='fw-semibold'>Volver a iniciar sesión</Link>
        </p>
      </form>
    </AuthLayout>
  )
}

export default ForgotPassword
