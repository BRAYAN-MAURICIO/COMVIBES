const makeCrudController = require('./genericCrud.factory')

module.exports = makeCrudController({
  table: 'metodospago',
  pk: 'idMet',
  fields: ['nombre', 'descripcion', 'activo'],
  normalize: (r) => ({ ...r, activo: Boolean(r.activo) }),
})
