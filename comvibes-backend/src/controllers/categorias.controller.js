const makeCrudController = require('./genericCrud.factory')
const { fail } = require('../utils/response')
const asyncHandler = require('../utils/asyncHandler')
const { pool } = require('../config/db')
const { ok, created } = require('../utils/response')

// Categorías tiene validación propia de nombre obligatorio
// y lógica de borrado protegida (no borrar si tiene productos)
const base = makeCrudController({
  table: 'categorias',
  pk: 'idCat',
  fields: ['nombre', 'descripcion'],
})

const createCategoria = asyncHandler(async (req, res) => {
  const { nombre, descripcion } = req.body
  if (!nombre || !nombre.trim()) return fail(res, 'El nombre de la categoría es obligatorio.')

  const [existing] = await pool.query('SELECT idCat FROM categorias WHERE nombre = ?', [nombre.trim()])
  if (existing.length > 0) return fail(res, `Ya existe una categoría con el nombre "${nombre.trim()}".`, 409)

  const [result] = await pool.query(
    'INSERT INTO categorias (nombre, descripcion) VALUES (?, ?)',
    [nombre.trim(), descripcion || null]
  )
  const [rows] = await pool.query('SELECT * FROM categorias WHERE idCat = ?', [result.insertId])
  return created(res, rows[0])
})

const deleteCategoria = asyncHandler(async (req, res) => {
  const [productos] = await pool.query('SELECT COUNT(*) AS total FROM productos WHERE idCat = ?', [req.params.id])
  if (productos[0].total > 0) {
    return fail(res, `No se puede eliminar: tiene ${productos[0].total} producto(s) asociado(s). Reasigna o elimina los productos primero.`, 409)
  }
  const [result] = await pool.query('DELETE FROM categorias WHERE idCat = ?', [req.params.id])
  if (result.affectedRows === 0) return fail(res, 'Categoría no encontrada.', 404)
  return ok(res, { deleted: true })
})

module.exports = { ...base, create: createCategoria, remove: deleteCategoria }
