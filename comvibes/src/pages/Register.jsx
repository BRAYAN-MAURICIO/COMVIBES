import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Swal from 'sweetalert2'
import { User, Mail, CreditCard, Lock } from 'lucide-react'
import AuthLayout from '../components/layout/AuthLayout'
import { useAuth } from '../context/AuthContext'
import {
  required,
  isEmail,
  minLength,
  onlyLetters,
  onlyNumbers,
  matches,
  runValidations,
} from '../utils/validators'

const initialForm = {
  nombre: '',
  apellido: '',
  correo: '',
  password: '',
  confirmPassword: '',
  documento_id: '',
}

function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const validate = () =>
    runValidations({
      nombre: [form.nombre, [(v) => required(v, 'El nombre'), (v) => onlyLetters(v, 'El nombre')]],
      apellido: [form.apellido, [(v) => required(v, 'El apellido'), (v) => onlyLetters(v, 'El apellido')]],
      correo: [form.correo, [(v) => required(v, 'El correo'), isEmail]],
      password: [form.password, [(v) => required(v, 'La contraseña'), (v) => minLength(v, 8, 'La contraseña')]],
      confirmPassword: [
        form.confirmPassword,
        [
          (v) => required(v, 'La confirmación de contraseña'),
          (v) => matches(v, form.password, 'Las contraseñas'),
        ],
      ],
      // documento_id es opcional en BD — solo validar formato si el usuario lo ingresó
      ...(form.documento_id ? { documento_id: [form.documento_id, [(v) => onlyNumbers(v, 'El documento')]] } : {}),
    })

  const handleSubmit = async (e) => {
    e.preventDefault()

    const validationErrors = validate()
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setLoading(true)
    try {
      // El registro ya no abre sesión: crea la cuenta pendiente y el backend
      // manda un código de 6 dígitos al correo. La sesión se abre al verificar.
      await register(form)
      const correoRegistrado = form.correo
      await Swal.fire({
        icon: 'success',
        title: 'Revisa tu correo',
        html: `Enviamos un código de verificación a <strong>${correoRegistrado}</strong>.<br>Ingrésalo para activar tu cuenta.`,
        confirmButtonText: 'Ingresar el código',
      })
      setForm(initialForm)
      navigate('/verificar-correo', { replace: true, state: { correo: correoRegistrado } })
    } catch (err) {
      // Cuenta ya creada pero sin verificar: en vez de dejarlo bloqueado, lo
      // mandamos a la pantalla de verificación donde puede pedir otro código.
      if (err.details?.requiereVerificacion) {
        await Swal.fire({
          icon: 'info',
          title: 'Cuenta pendiente de verificar',
          text: err.message,
          confirmButtonText: 'Ir a verificar',
        })
        navigate('/verificar-correo', { state: { correo: form.correo } })
        return
      }
      Swal.fire({ icon: 'error', title: 'No se pudo completar el registro', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  const fieldConfig = [
    { name: 'nombre', label: 'Nombre', type: 'text', autoComplete: 'given-name', col: 'col-md-6', icon: User },
    { name: 'apellido', label: 'Apellido', type: 'text', autoComplete: 'family-name', col: 'col-md-6', icon: User },
    { name: 'correo', label: 'Correo', type: 'email', autoComplete: 'email', col: 'col-12', icon: Mail },
    { name: 'documento_id', label: 'Documento (opcional)', type: 'text', autoComplete: 'off', col: 'col-12', icon: CreditCard },
    { name: 'password', label: 'Contraseña', type: 'password', autoComplete: 'new-password', col: 'col-md-6', icon: Lock },
    { name: 'confirmPassword', label: 'Confirmar', type: 'password', autoComplete: 'new-password', col: 'col-md-6', icon: Lock },
  ]

  return (
    <AuthLayout title='Crear cuenta' subtitle='Únete y guarda tus favoritos y pedidos'>
      <form onSubmit={handleSubmit} noValidate>
        <div className='row g-3'>
          {fieldConfig.map((field) => {
            const Icon = field.icon
            return (
              <div className={field.col} key={field.name}>
                <label htmlFor={field.name} className='form-label'>{field.label}</label>
                <div className='input-icon'>
                  <Icon size={16} className='input-icon__glyph' />
                  <input
                    id={field.name}
                    name={field.name}
                    type={field.type}
                    className={`form-control ${errors[field.name] ? 'is-invalid' : ''}`}
                    placeholder={field.label}
                    value={form[field.name]}
                    onChange={handleChange}
                    autoComplete={field.autoComplete}
                  />
                </div>
                {errors[field.name] && (
                  <div className='invalid-feedback d-block'>{errors[field.name]}</div>
                )}
              </div>
            )
          })}
        </div>

        <button type='submit' className='btn btn-primary w-100 mt-4' disabled={loading}>
          {loading ? 'Creando cuenta...' : 'Registrarse'}
        </button>

        <p className='text-center mt-4 mb-0'>
          ¿Ya tienes cuenta? <Link to='/login' className='fw-semibold'>Inicia sesión</Link>
        </p>
      </form>
    </AuthLayout>
  )
}

export default Register
