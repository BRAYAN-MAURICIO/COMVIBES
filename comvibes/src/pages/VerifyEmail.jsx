import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom'
import Swal from 'sweetalert2'
import { MailCheck, ShieldCheck, RefreshCw } from 'lucide-react'
import AuthLayout from '../components/layout/AuthLayout'
import { useAuth } from '../context/AuthContext'
import { required, isEmail, minLength, runValidations } from '../utils/validators'

const REENVIO_ESPERA = 60 // segundos entre reenvíos, para no golpear el rate limit del backend

function VerifyEmail() {
  const { verifyEmail, resendVerification } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  // El correo llega por state al venir del registro/login; el ?correo= es el
  // respaldo para cuando el usuario recarga la página o guarda el enlace.
  const correoInicial = location.state?.correo || searchParams.get('correo') || ''

  const [correo, setCorreo] = useState(correoInicial)
  const [codigo, setCodigo] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [reenviando, setReenviando] = useState(false)
  const [espera, setEspera] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Cuenta regresiva del botón "Reenviar código"
  useEffect(() => {
    if (espera <= 0) return undefined
    const id = setInterval(() => setEspera((s) => s - 1), 1000)
    return () => clearInterval(id)
  }, [espera])

  const validate = () =>
    runValidations({
      correo: [correo, [(v) => required(v, 'El correo'), isEmail]],
      codigo: [codigo, [(v) => required(v, 'El código'), (v) => minLength(v, 6, 'El código')]],
    })

  const handleSubmit = async (e) => {
    e.preventDefault()

    const validationErrors = validate()
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setLoading(true)
    try {
      await verifyEmail(correo, codigo)
      await Swal.fire({
        icon: 'success',
        title: '¡Cuenta activada!',
        text: 'Ya puedes empezar a comprar.',
        timer: 1600,
        showConfirmButton: false,
      })
      navigate('/', { replace: true })
    } catch (err) {
      setCodigo('')
      inputRef.current?.focus()
      Swal.fire({ icon: 'error', title: 'No se pudo verificar', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    const errorCorreo = runValidations({
      correo: [correo, [(v) => required(v, 'El correo'), isEmail]],
    })
    if (errorCorreo.correo) {
      setErrors(errorCorreo)
      return
    }

    setReenviando(true)
    try {
      await resendVerification(correo)
      setEspera(REENVIO_ESPERA)
      Swal.fire({
        icon: 'success',
        title: 'Código reenviado',
        text: 'Revisa tu bandeja de entrada (y la carpeta de spam).',
        timer: 2200,
        showConfirmButton: false,
      })
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'No se pudo reenviar', text: err.message })
    } finally {
      setReenviando(false)
    }
  }

  return (
    <AuthLayout
      title='Verifica tu correo'
      subtitle='Te enviamos un código de 6 dígitos para activar tu cuenta'
    >
      <div className='alert alert-info py-2 mb-3 small d-flex align-items-start gap-2'>
        <MailCheck size={18} className='flex-shrink-0 mt-1' />
        <span>
          {correoInicial ? (
            <>Enviamos el código a <strong>{correoInicial}</strong>. Vence en 10 minutos.</>
          ) : (
            <>Ingresa el correo con el que te registraste y el código que recibiste.</>
          )}
          {' '}Si no lo ves, revisa la carpeta de spam.
        </span>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {!correoInicial && (
          <div className='mb-3'>
            <label htmlFor='correo' className='form-label'>Correo</label>
            <input
              id='correo'
              type='email'
              className={`form-control ${errors.correo ? 'is-invalid' : ''}`}
              placeholder='tucorreo@ejemplo.com'
              value={correo}
              onChange={(e) => { setCorreo(e.target.value); setErrors((p) => ({ ...p, correo: '' })) }}
              autoComplete='email'
            />
            {errors.correo && <div className='invalid-feedback d-block'>{errors.correo}</div>}
          </div>
        )}

        <div className='mb-3'>
          <label htmlFor='codigo' className='form-label'>Código de verificación</label>
          <div className='input-icon'>
            <ShieldCheck size={16} className='input-icon__glyph' />
            <input
              id='codigo'
              ref={inputRef}
              type='text'
              inputMode='numeric'
              maxLength={6}
              className={`form-control ${errors.codigo ? 'is-invalid' : ''}`}
              placeholder='123456'
              style={{ letterSpacing: '0.35em', fontWeight: 600 }}
              value={codigo}
              onChange={(e) => {
                setCodigo(e.target.value.replace(/\D/g, ''))
                setErrors((p) => ({ ...p, codigo: '' }))
              }}
              autoComplete='one-time-code'
            />
          </div>
          {errors.codigo && <div className='invalid-feedback d-block'>{errors.codigo}</div>}
        </div>

        <button type='submit' className='btn btn-primary w-100 mt-2' disabled={loading}>
          {loading ? 'Verificando...' : 'Activar mi cuenta'}
        </button>

        <button
          type='button'
          className='btn btn-outline-secondary w-100 mt-2 d-flex align-items-center justify-content-center gap-2'
          onClick={handleResend}
          disabled={reenviando || espera > 0}
        >
          <RefreshCw size={16} />
          {espera > 0 ? `Reenviar código en ${espera}s` : reenviando ? 'Enviando...' : 'Reenviar código'}
        </button>

        <p className='text-center mt-4 mb-0'>
          <Link to='/login' className='fw-semibold'>Volver a iniciar sesión</Link>
        </p>
      </form>
    </AuthLayout>
  )
}

export default VerifyEmail
