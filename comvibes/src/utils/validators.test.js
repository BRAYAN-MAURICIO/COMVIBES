import { describe, it, expect } from 'vitest'
import {
  required, isEmail, minLength, onlyLetters, onlyNumbers,
  positiveNumber, nonNegativeNumber, matches, runValidations,
} from './validators'

describe('validators', () => {
  it('required rechaza vacío y solo espacios', () => {
    expect(required('', 'El nombre')).toBe('El nombre es obligatorio')
    expect(required('   ')).toBe('Este campo es obligatorio')
    expect(required(null)).not.toBe('')
    expect(required('Ana')).toBe('')
    expect(required(0)).toBe('')
  })

  it('isEmail valida el formato pero deja pasar vacío (para eso está required)', () => {
    expect(isEmail('ana@correo.com')).toBe('')
    expect(isEmail('ana@correo')).toBe('Formato de correo inválido')
    expect(isEmail('ana correo@x.co')).toBe('Formato de correo inválido')
    expect(isEmail('')).toBe('')
  })

  it('minLength cuenta caracteres', () => {
    expect(minLength('1234567', 8, 'La contraseña')).toMatch(/al menos 8/)
    expect(minLength('12345678', 8)).toBe('')
  })

  it('onlyLetters acepta tildes y ñ; onlyNumbers solo dígitos', () => {
    expect(onlyLetters('José Peña')).toBe('')
    expect(onlyLetters('Ana3')).not.toBe('')
    expect(onlyNumbers('3001234567')).toBe('')
    expect(onlyNumbers('300-123')).not.toBe('')
  })

  it('positiveNumber y nonNegativeNumber distinguen el cero', () => {
    expect(positiveNumber('0', 'El precio')).toBe('El precio debe ser mayor que cero')
    expect(positiveNumber('abc')).toMatch(/número/)
    expect(positiveNumber('15000')).toBe('')
    expect(nonNegativeNumber('0')).toBe('')
    expect(nonNegativeNumber('-1', 'El inventario')).toBe('El inventario no puede ser negativo')
  })

  it('matches compara dos valores', () => {
    expect(matches('a', 'a')).toBe('')
    expect(matches('a', 'b', 'Las contraseñas')).toBe('Las contraseñas no coinciden')
  })

  it('runValidations devuelve solo los campos con error y el primer mensaje de cada uno', () => {
    const errores = runValidations({
      correo: ['', [(v) => required(v, 'El correo'), isEmail]],
      password: ['12345678', [(v) => required(v, 'La contraseña'), (v) => minLength(v, 8)]],
    })
    expect(errores).toEqual({ correo: 'El correo es obligatorio' })
  })
})
