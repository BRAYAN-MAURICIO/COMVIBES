const { pool } = require('../config/db')
const { ok, created, fail } = require('../utils/response')
const asyncHandler = require('../utils/asyncHandler')

const normalize = (r) => ({ ...r, predeterminada: Boolean(r.predeterminada) })

// GET /api/direcciones (propias) o /api/direcciones?idUsu= (admin viendo las de otro)
const listDirecciones = asyncHandler(async (req, res) => {
  const idUsu = req.user.rol === 'admin' && req.query.idUsu ? req.query.idUsu : req.user.idUsu
  const [rows] = await pool.query(
    'SELECT * FROM direcciones WHERE idUsu = ? ORDER BY predeterminada DESC, idDir ASC',
    [idUsu]
  )
  return ok(res, rows.map(normalize))
})

const createDireccion = asyncHandler(async (req, res) => {
  const { etiqueta, direccion, departamento, ciudad, pais = 'Colombia', codigo_postal, telefono, predeterminada } = req.body
  if (!direccion || !ciudad) return fail(res, 'direccion y ciudad son obligatorias.')

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    const [existentes] = await conn.query('SELECT idDir FROM direcciones WHERE idUsu = ?', [req.user.idUsu])
    const esPrimera = existentes.length === 0
    const seraDefault = esPrimera ? true : Boolean(predeterminada)

    if (seraDefault) {
      await conn.query('UPDATE direcciones SET predeterminada = FALSE WHERE idUsu = ?', [req.user.idUsu])
    }

    const [result] = await conn.query(
      `INSERT INTO direcciones (idUsu, etiqueta, direccion, departamento, ciudad, pais, codigo_postal, telefono, predeterminada)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.idUsu, etiqueta || null, direccion, departamento || null, ciudad, pais, codigo_postal || null, telefono || null, seraDefault]
    )

    await conn.commit()
    const [rows] = await pool.query('SELECT * FROM direcciones WHERE idDir = ?', [result.insertId])
    return created(res, normalize(rows[0]))
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
})

const updateDireccion = asyncHandler(async (req, res) => {
  const { etiqueta, direccion, departamento, ciudad, pais, codigo_postal, telefono, predeterminada } = req.body

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    // FIX: si están desmarcando la predeterminada (predeterminada === false),
    // verificar que exista otra dirección que ya sea predeterminada. Sin esto
    // el usuario podría quedar sin ninguna predeterminada y el checkout fallaría
    // al intentar preseleccionar una dirección automáticamente.
    if (predeterminada === false) {
      const [otras] = await conn.query(
        'SELECT COUNT(*) AS total FROM direcciones WHERE idUsu = ? AND idDir != ? AND predeterminada = TRUE',
        [req.user.idUsu, req.params.id]
      )
      if (otras[0].total === 0) {
        await conn.rollback()
        return fail(res, 'Debes tener al menos una dirección predeterminada.', 400)
      }
    }

    if (predeterminada) {
      await conn.query('UPDATE direcciones SET predeterminada = FALSE WHERE idUsu = ?', [req.user.idUsu])
    }

    const [result] = await conn.query(
      `UPDATE direcciones SET
        etiqueta = COALESCE(?, etiqueta), direccion = COALESCE(?, direccion),
        departamento = COALESCE(?, departamento), ciudad = COALESCE(?, ciudad),
        pais = COALESCE(?, pais), codigo_postal = COALESCE(?, codigo_postal), telefono = COALESCE(?, telefono),
        predeterminada = COALESCE(?, predeterminada)
       WHERE idDir = ? AND idUsu = ?`,
      [etiqueta, direccion, departamento, ciudad, pais, codigo_postal, telefono, predeterminada, req.params.id, req.user.idUsu]
    )
    if (result.affectedRows === 0) {
      await conn.rollback()
      return fail(res, 'Dirección no encontrada.', 404)
    }

    await conn.commit()
    const [rows] = await pool.query('SELECT * FROM direcciones WHERE idDir = ?', [req.params.id])
    return ok(res, normalize(rows[0]))
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
})

const deleteDireccion = asyncHandler(async (req, res) => {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    // Verificar si la dirección que se va a borrar era la predeterminada
    const [dirRows] = await conn.query(
      'SELECT predeterminada FROM direcciones WHERE idDir = ? AND idUsu = ?',
      [req.params.id, req.user.idUsu]
    )
    if (dirRows.length === 0) {
      await conn.rollback()
      return fail(res, 'Dirección no encontrada.', 404)
    }
    const eraPredeterminada = Boolean(dirRows[0].predeterminada)

    await conn.query('DELETE FROM direcciones WHERE idDir = ? AND idUsu = ?', [
      req.params.id,
      req.user.idUsu,
    ])

    // Si era la predeterminada, promover la siguiente dirección disponible
    // para que el usuario siempre tenga una seleccionada por defecto.
    if (eraPredeterminada) {
      const [restantes] = await conn.query(
        'SELECT idDir FROM direcciones WHERE idUsu = ? ORDER BY idDir ASC LIMIT 1',
        [req.user.idUsu]
      )
      if (restantes.length > 0) {
        await conn.query(
          'UPDATE direcciones SET predeterminada = TRUE WHERE idDir = ?',
          [restantes[0].idDir]
        )
      }
    }

    await conn.commit()
    return ok(res, { deleted: true })
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
})

module.exports = { listDirecciones, createDireccion, updateDireccion, deleteDireccion }
