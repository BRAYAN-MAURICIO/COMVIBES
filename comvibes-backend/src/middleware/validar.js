const { fail } = require('../utils/response')

// Valida req.body (y opcionalmente req.params) contra un esquema de zod antes
// de llegar al controlador. Auditoría ISO 2026-09-26, hallazgo H5: cada
// controlador validaba a mano y de forma desigual (cantidades que llegaban
// como texto y se concatenaban, precios y stock negativos, correos sin
// formato, estados fuera del enum...).
//
// - Si el cuerpo es válido, req.body se reemplaza por la versión ya limpia
//   (tipos convertidos, espacios recortados y SIN campos desconocidos: un
//   cliente no puede colar columnas que el formulario no ofrece).
// - Si no, responde 400 con el primer error en español como `message` y la
//   lista completa en `details.campos`, para que el frontend pueda marcar
//   cada campo si lo necesita.

const vacio = (v) => v === undefined || v === null || v === ''

function valorEn(obj, path) {
  return path.reduce((acc, k) => (acc == null ? undefined : acc[k]), obj)
}

function mensajeDe(issue, original) {
  const campo = issue.path.length ? issue.path.join('.') : 'El cuerpo de la petición'

  // Un mensaje escrito a mano en el esquema siempre gana.
  if (issue.message && !/^(Invalid|Too|Expected|Unrecognized)/.test(issue.message)) {
    return issue.message
  }

  switch (issue.code) {
    case 'invalid_type':
      return vacio(valorEn(original, issue.path))
        ? `${campo} es obligatorio.`
        : `${campo} tiene un tipo de dato inválido.`
    case 'too_small':
      if (issue.origin === 'string') {
        return issue.minimum <= 1 ? `${campo} es obligatorio.` : `${campo} debe tener mínimo ${issue.minimum} caracteres.`
      }
      if (issue.origin === 'array') return `${campo} debe tener mínimo ${issue.minimum} elemento(s).`
      return `${campo} debe ser ${issue.inclusive ? 'mayor o igual a' : 'mayor que'} ${issue.minimum}.`
    case 'too_big':
      if (issue.origin === 'string') return `${campo} admite máximo ${issue.maximum} caracteres.`
      if (issue.origin === 'array') return `${campo} admite máximo ${issue.maximum} elemento(s).`
      return `${campo} debe ser ${issue.inclusive ? 'menor o igual a' : 'menor que'} ${issue.maximum}.`
    case 'invalid_format':
      return issue.format === 'email' ? `${campo} debe ser un correo válido.` : `${campo} tiene un formato inválido.`
    case 'invalid_value':
      return `${campo} debe ser uno de: ${issue.values.join(', ')}.`
    default:
      return `${campo} no es válido.`
  }
}

function validar({ body, params } = {}) {
  return (req, res, next) => {
    for (const [parte, esquema] of [['params', params], ['body', body]]) {
      if (!esquema) continue
      const original = req[parte] ?? {}
      const r = esquema.safeParse(original)
      if (!r.success) {
        const campos = r.error.issues.map((i) => ({
          campo: i.path.join('.'),
          mensaje: mensajeDe(i, original),
        }))
        return fail(res, campos[0].mensaje, 400, { campos })
      }
      req[parte] = r.data
    }
    next()
  }
}

module.exports = { validar }
