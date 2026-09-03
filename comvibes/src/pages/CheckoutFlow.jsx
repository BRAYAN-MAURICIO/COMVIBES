import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Swal from 'sweetalert2'
import { Check, MapPin, CreditCard, Plus } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { useOrders } from '../context/OrdersContext'
import { useAddresses } from '../context/AddressesContext'
import { useMetodosPago } from '../context/MetodosPagoContext'
import { syncCarrito } from '../api/carrito'
import Breadcrumbs from '../components/ui/Breadcrumbs'
import AddressForm from '../components/addresses/AddressForm'
import AddressCard from '../components/addresses/AddressCard'
import { required, isEmail, runValidations } from '../utils/validators'
import { formatCurrency } from '../utils/formatters'

const initialForm = {
  nombreCompleto: '',
  correo: '',
  idMet: '',
}

function CheckoutFlow() {
  const { items, total, clearCart } = useCart()
  const { user } = useAuth()
  const { createOrder } = useOrders()
  const { getByUser, addAddress } = useAddresses()
  const { metodos } = useMetodosPago()
  const navigate = useNavigate()

  const direccionesUsuario = getByUser(user?.idUsu)

  const [form, setForm] = useState({
    ...initialForm,
    nombreCompleto: user ? `${user.nombre} ${user.apellido}` : '',
    correo: user?.correo || '',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  // Dirección de envío: se elige una guardada de la libreta, o se agrega una nueva al vuelo.
  // Se usa useEffect en vez de inicializar el useState directamente porque
  // AddressesContext puede estar cargando cuando este componente monta: si
  // direccionesUsuario llega vacío en el primer render, el useState se fijaría
  // en null y nunca se actualizaría aunque las direcciones llegaran después.
  const [selectedAddressId, setSelectedAddressId] = useState(null)
  const [newAddressFormOpen, setNewAddressFormOpen] = useState(false)
  const [addressError, setAddressError] = useState('')
  // Ref para saber si ya hicimos la selección inicial automática.
  // Sin esto, cuando el usuario elige una dirección no predeterminada y el
  // contexto re-renderiza (p.ej. tras agregar una dirección nueva), el
  // useEffect volvía a correr y pisaba la selección del usuario.
  const initialSelectionDone = useRef(false)

  useEffect(() => {
    if (direccionesUsuario.length === 0) {
      setNewAddressFormOpen(true)
      setSelectedAddressId(null)
      initialSelectionDone.current = false
    } else {
      // FIX: NO cerrar el formulario aqui cuando ya hay direcciones.
      // El useEffect antes llamaba setNewAddressFormOpen(false) en este else,
      // lo que hacia que cualquier re-render del contexto cerrara el formulario
      // inmediatamente despues de que el usuario lo abria con el boton
      // "Agregar otra direccion" — aparecia un instante y desaparecia.
      // El cierre/apertura cuando ya hay direcciones es responsabilidad
      // exclusiva del usuario (boton y onCancel), no del effect.
      if (!initialSelectionDone.current) {
        initialSelectionDone.current = true
        const predeterminada = direccionesUsuario.find((d) => d.predeterminada)
        setSelectedAddressId(predeterminada?.idDir ?? direccionesUsuario[0]?.idDir ?? null)
      }
    }
  }, [direccionesUsuario])

  const handleSaveNewAddress = async (values) => {
    const nueva = await addAddress(values)
    setSelectedAddressId(nueva.idDir)
    setNewAddressFormOpen(false)
    setAddressError('')
  }

  if (items.length === 0) {
    return (
      <div className='container py-5 text-center'>
        <Breadcrumbs items={[{ label: 'Checkout' }]} />
        <h2 className='fw-bold text-primary'>No hay productos para pagar</h2>
        <p className='text-muted'>Agrega productos al carrito antes de continuar.</p>
        <Link to='/catalogo' className='btn btn-primary mt-3'>
          Ir al catálogo
        </Link>
      </div>
    )
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const validate = () =>
    runValidations({
      nombreCompleto: [form.nombreCompleto, [(v) => required(v, 'El nombre completo')]],
      correo: [form.correo, [(v) => required(v, 'El correo'), isEmail]],
      idMet: [form.idMet, [(v) => required(v, 'El método de pago')]],
    })

  const handleSubmit = async (e) => {
    e.preventDefault()

    const validationErrors = validate()
    setErrors(validationErrors)
    if (!selectedAddressId) {
      setAddressError('Selecciona o agrega una dirección de envío')
    }
    if (Object.keys(validationErrors).length > 0 || !selectedAddressId) return

    setLoading(true)
    try {
      // Sincroniza el carrito local con el backend antes de crear el pedido.
      // Si esto falla (stock insuficiente, producto inactivo, etc.) el backend
      // devuelve un error claro antes de tocar nada del pedido.
      try {
        await syncCarrito(items.map((i) => ({ idPro: i.idPro, cantidad: i.cantidad })))
      } catch (syncErr) {
        throw new Error(`No se pudo sincronizar el carrito: ${syncErr.message}`)
      }

      // El backend arma pedido + pago + factura + envío + descuenta stock
      // en una sola transacción, y ya deja el carrito del servidor vacío.
      const nuevoPedido = await createOrder({ idDir: selectedAddressId, idMet: Number(form.idMet) })

      await Swal.fire({
        icon: 'success',
        title: 'Compra confirmada',
        text: 'Tu pedido fue registrado correctamente',
        timer: 1600,
        showConfirmButton: false,
      })

      clearCart()
      navigate(`/factura/${nuevoPedido.idPed}`, { replace: true })
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'No se pudo procesar el pago', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    { label: 'Carrito', done: true },
    { label: 'Datos y pago', done: false, active: true },
    { label: 'Confirmación', done: false },
  ]

  return (
    <div className='container py-5'>
      <Breadcrumbs items={[{ label: 'Carrito', to: '/carrito' }, { label: 'Checkout' }]} />

      <h1 className='fw-bold text-primary mb-4'>Proceso de Compra</h1>

      {/* Indicador de pasos — visual, ya que el envío sigue siendo un
          único submit; ayuda a ubicar al usuario dentro del flujo */}
      <div className='checkout-steps mb-5'>
        {steps.map((step, index) => (
          <div key={step.label} className='checkout-steps__step'>
            <div
              className={`checkout-steps__circle ${step.done ? 'checkout-steps__circle--done' : ''} ${step.active ? 'checkout-steps__circle--active' : ''}`}
            >
              {step.done ? <Check size={14} /> : index + 1}
            </div>
            <span className={step.active ? 'fw-semibold text-primary' : 'text-muted'}>
              {step.label}
            </span>
            {index < steps.length - 1 && <div className='checkout-steps__line' />}
          </div>
        ))}
      </div>

      <div className='row'>
        <div className='col-lg-7'>
          <div className='card shadow border-0 rounded-4 p-4 p-md-5'>
            <form onSubmit={handleSubmit} noValidate>
              <div className='d-flex align-items-center gap-2 mb-3'>
                <span className='checkout-section-badge'>1</span>
                <h6 className='fw-bold mb-0 d-flex align-items-center gap-2'>
                  <MapPin size={16} /> Información de envío
                </h6>
              </div>

              <div className='row'>
                <div className='col-md-6 mb-3'>
                  <label htmlFor='nombreCompleto' className='form-label'>Nombre Completo</label>
                  <input
                    id='nombreCompleto'
                    name='nombreCompleto'
                    type='text'
                    className={`form-control ${errors.nombreCompleto ? 'is-invalid' : ''}`}
                    value={form.nombreCompleto}
                    onChange={handleChange}
                  />
                  {errors.nombreCompleto && <div className='invalid-feedback'>{errors.nombreCompleto}</div>}
                </div>

                <div className='col-md-6 mb-3'>
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

              {direccionesUsuario.length > 0 && (
                <div className='row g-3 mb-3'>
                  {direccionesUsuario.map((address) => (
                    <div className='col-md-6' key={address.idDir}>
                      <AddressCard
                        address={address}
                        mode='select'
                        selected={selectedAddressId === address.idDir}
                        onSelect={() => {
                          setSelectedAddressId(address.idDir)
                          setAddressError('')
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {addressError && <div className='text-danger small mb-3'>{addressError}</div>}

              {newAddressFormOpen ? (
                <div className='border rounded-4 p-3 p-md-4 mb-3 bg-light'>
                  <h6 className='fw-semibold mb-3'>Nueva dirección de envío</h6>
                  <AddressForm
                    submitLabel='Usar esta dirección'
                    onSubmit={handleSaveNewAddress}
                    onCancel={direccionesUsuario.length > 0 ? () => setNewAddressFormOpen(false) : undefined}
                  />
                </div>
              ) : (
                <button
                  type='button'
                  className='btn btn-outline-primary btn-sm d-flex align-items-center gap-2 mb-3'
                  onClick={() => setNewAddressFormOpen(true)}
                >
                  <Plus size={14} /> Agregar otra dirección
                </button>
              )}

              <hr className='my-4' />

              <div className='d-flex align-items-center gap-2 mb-3'>
                <span className='checkout-section-badge'>2</span>
                <h6 className='fw-bold mb-0 d-flex align-items-center gap-2'>
                  <CreditCard size={16} /> Método de pago
                </h6>
              </div>

              <div className='mb-3'>
                <select
                  id='idMet'
                  name='idMet'
                  className={`form-select ${errors.idMet ? 'is-invalid' : ''}`}
                  value={form.idMet}
                  onChange={handleChange}
                  aria-label='Método de pago'
                >
                  <option value=''>Selecciona un método</option>
                  {metodos.map((met) => (
                    <option key={met.idMet} value={met.idMet}>
                      {met.nombre} — {met.descripcion}
                    </option>
                  ))}
                </select>
                {errors.idMet && <div className='invalid-feedback d-block'>{errors.idMet}</div>}
              </div>

              <button type='submit' className='btn btn-primary mt-3 w-100' disabled={loading}>
                {loading ? 'Procesando...' : 'Finalizar Compra'}
              </button>
            </form>
          </div>
        </div>

        <div className='col-lg-5'>
          <div className='card shadow border-0 rounded-4 p-4' style={{ position: 'sticky', top: '96px' }}>
            <h5 className='fw-bold mb-4'>Resumen del pedido</h5>

            {items.map((item) => (
              <div key={item.idPro} className='d-flex justify-content-between mb-2 small'>
                <span>{item.cantidad} × {item.nombre}</span>
                <span>{formatCurrency(item.precio * item.cantidad)}</span>
              </div>
            ))}

            <hr />

            <div className='d-flex justify-content-between'>
              <strong>Total</strong>
              <strong className='text-primary'>{formatCurrency(total)}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CheckoutFlow
