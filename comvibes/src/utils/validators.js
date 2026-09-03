// utils/validators.js
// Funciones puras de validación. No dependen de React ni de estado:
// reciben un valor y devuelven un string de error (o '' si es válido).
// Así se pueden reutilizar tanto en formularios controlados como en tests.

export const required = (value, label = 'Este campo') => {
  if (value === undefined || value === null) return `${label} es obligatorio`
  if (typeof value === 'string' && value.trim() === '') return `${label} es obligatorio`
  return ''
}

export const isEmail = (value) => {
  if (!value) return ''
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(value) ? '' : 'Formato de correo inválido'
}

export const minLength = (value, min, label = 'Este campo') => {
  if (!value) return ''
  return value.length >= min ? '' : `${label} debe tener al menos ${min} caracteres`
}

export const maxLength = (value, max, label = 'Este campo') => {
  if (!value) return ''
  return value.length <= max ? '' : `${label} no puede superar ${max} caracteres`
}

export const onlyLetters = (value, label = 'Este campo') => {
  if (!value) return ''
  const regex = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/
  return regex.test(value) ? '' : `${label} solo puede contener letras`
}

export const onlyNumbers = (value, label = 'Este campo') => {
  if (!value) return ''
  const regex = /^[0-9]+$/
  return regex.test(value) ? '' : `${label} solo puede contener números`
}

export const positiveNumber = (value, label = 'Este campo') => {
  if (value === '' || value === null || value === undefined) return ''
  const num = Number(value)
  if (Number.isNaN(num)) return `${label} debe ser un número`
  return num > 0 ? '' : `${label} debe ser mayor que cero`
}

export const nonNegativeNumber = (value, label = 'Este campo') => {
  if (value === '' || value === null || value === undefined) return ''
  const num = Number(value)
  if (Number.isNaN(num)) return `${label} debe ser un número`
  return num >= 0 ? '' : `${label} no puede ser negativo`
}

export const matches = (value, other, label = 'Los campos') => {
  return value === other ? '' : `${label} no coinciden`
}

// Ejecuta una lista de reglas [valor, [validadores...]] y devuelve
// un objeto { campo: 'mensaje de error' } solo con los campos que fallan.
// Uso:
//   const errors = runValidations({
//     correo: [correo, [ (v) => required(v, 'El correo'), isEmail ]],
//     password: [password, [ (v) => required(v, 'La contraseña') ]],
//   })
export const runValidations = (schema) => {
  const errors = {}
  Object.entries(schema).forEach(([field, [value, rules]]) => {
    for (const rule of rules) {
      const message = rule(value)
      if (message) {
        errors[field] = message
        break
      }
    }
  })
  return errors
}
