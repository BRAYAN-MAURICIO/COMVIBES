const { pool } = require('../config/db')
const { ok, created, fail } = require('../utils/response')
const asyncHandler = require('../utils/asyncHandler')

// Genera los 5 controllers CRUD estándar para tablas "catálogo" simples
// (categorias, proveedores, metodospago), donde no hay lógica de negocio
// especial más allá de un INSERT/UPDATE/DELETE directo.
//
// table: nombre de la tabla
// pk: nombre de la columna llave primaria (ej. 'idCat')
// fields: columnas insertables/editables, en el orden que se quiera guardar
function makeCrudController({ table, pk, fields, normalize = (r) => r }) {
  const list = asyncHandler(async (req, res) => {
    const [rows] = await pool.query(`SELECT * FROM ${table} ORDER BY ${pk} ASC`)
    return ok(res, rows.map(normalize))
  })

  const getOne = asyncHandler(async (req, res) => {
    const [rows] = await pool.query(`SELECT * FROM ${table} WHERE ${pk} = ?`, [req.params.id])
    if (rows.length === 0) return fail(res, 'No encontrado.', 404)
    return ok(res, normalize(rows[0]))
  })

  const create = asyncHandler(async (req, res) => {
    const values = fields.map((f) => req.body[f] ?? null)
    const placeholders = fields.map(() => '?').join(', ')
    const [result] = await pool.query(
      `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders})`,
      values
    )
    const [rows] = await pool.query(`SELECT * FROM ${table} WHERE ${pk} = ?`, [result.insertId])
    return created(res, normalize(rows[0]))
  })

  const update = asyncHandler(async (req, res) => {
    const setClause = fields.map((f) => `${f} = COALESCE(?, ${f})`).join(', ')
    const values = fields.map((f) => req.body[f] ?? null)
    const [result] = await pool.query(`UPDATE ${table} SET ${setClause} WHERE ${pk} = ?`, [
      ...values,
      req.params.id,
    ])
    if (result.affectedRows === 0) return fail(res, 'No encontrado.', 404)
    const [rows] = await pool.query(`SELECT * FROM ${table} WHERE ${pk} = ?`, [req.params.id])
    return ok(res, normalize(rows[0]))
  })

  const remove = asyncHandler(async (req, res) => {
    const [result] = await pool.query(`DELETE FROM ${table} WHERE ${pk} = ?`, [req.params.id])
    if (result.affectedRows === 0) return fail(res, 'No encontrado.', 404)
    return ok(res, { deleted: true })
  })

  return { list, getOne, create, update, remove }
}

module.exports = makeCrudController
