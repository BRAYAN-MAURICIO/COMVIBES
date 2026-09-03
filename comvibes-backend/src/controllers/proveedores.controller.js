const makeCrudController = require('./genericCrud.factory')
const { fail } = require('../utils/response')
const asyncHandler = require('../utils/asyncHandler')

const base = makeCrudController({
  table: 'proveedores',
  pk: 'idProv',
  fields: ['nombre', 'categoria', 'contacto', 'telefono', 'correo', 'direccion', 'ciudad', 'pais'],
})

// El factory genérico no valida nada: si llega un POST sin `nombre`,
// MySQL lanza ER_BAD_NULL_ERROR (nombre NOT NULL) y el asyncHandler devuelve
// un 500 sin mensaje claro. Sobreescribimos create para dar un 400 legible.
const createProveedor = asyncHandler(async (req, res) => {
  if (!req.body.nombre?.trim()) {
    return fail(res, 'El nombre del proveedor es obligatorio.')
  }
  return base.create(req, res)
})

module.exports = { ...base, create: createProveedor }
