const { pool } = require('../config/db')
const { ok, created, fail } = require('../utils/response')
const asyncHandler = require('../utils/asyncHandler')

// El frontend (ProductsContext / ProductCard / ProductGallery) espera un
// producto "plano" con: stock, imagenes[] y categoria como texto, aunque
// en la BD real esos datos viven en inventario, producto_imagenes y categorias.
// Este SELECT arma esa forma con JOINs.
//
// Las imágenes se agregan con GROUP_CONCAT en vez de JSON_ARRAYAGG/JSON_ARRAY:
// esas dos requieren MySQL 8.0+ o MariaDB 10.5+, y fallaban sin un mensaje
// claro en instalaciones más viejas. GROUP_CONCAT existe desde MySQL 4.1 y
// todas las versiones de MariaDB, así que es compatible con prácticamente
// cualquier instalación. Usamos '\u0001' como separador porque es muy
// improbable que aparezca dentro de una URL (a diferencia de la coma).
const IMG_SEPARATOR = '\u0001'
const SELECT_PRODUCTO_BASE = `
  SELECT
    p.idPro, p.nombre, p.marca, p.descripcion, p.precio, p.color, p.talla,
    p.idCat, cat.nombre AS categoria,
    p.idProv, prov.nombre AS proveedor,
    p.imagen_url AS imagen,
    p.activo, p.fecha_agregado,
    COALESCE(inv.cantidad_disp, 0) AS stock,
    imgs.imagenes AS imagenes,
    ROUND(COALESCE(op.promedio, 0), 1) AS calificacion_promedio,
    COALESCE(op.total, 0) AS total_opiniones
  FROM productos p
  LEFT JOIN categorias cat ON cat.idCat = p.idCat
  LEFT JOIN proveedores prov ON prov.idProv = p.idProv
  LEFT JOIN inventario inv ON inv.idPro = p.idPro
  LEFT JOIN (
    SELECT idPro, GROUP_CONCAT(url ORDER BY orden SEPARATOR '${IMG_SEPARATOR}') AS imagenes
    FROM producto_imagenes
    GROUP BY idPro
  ) imgs ON imgs.idPro = p.idPro
  LEFT JOIN (
    SELECT idPro, AVG(calificacion) AS promedio, COUNT(*) AS total
    FROM opiniones GROUP BY idPro
  ) op ON op.idPro = p.idPro
`

// imagenes llega como un string 'url1\u0001url2\u0001url3' (o null si el
// producto no tiene galería). Lo convertimos al array que espera el frontend.
function normalizeProducto(row) {
  if (!row) return row
  const imagenes = row.imagenes ? String(row.imagenes).split(IMG_SEPARATOR) : []
  return {
    ...row,
    precio: Number(row.precio) || 0,
    stock: Number(row.stock ?? 0),
    calificacion_promedio: Number(row.calificacion_promedio) || 0,
    total_opiniones: Number(row.total_opiniones ?? 0),
    activo: Boolean(row.activo),
    imagenes,
  }
}

// GET /api/productos?search=&categoria=&marca=&color=&minPrecio=&maxPrecio=&sortBy=&page=&limit=&includeInactive=
const listProductos = asyncHandler(async (req, res) => {
  const {
    categoria, search, marca, color,
    minPrecio, maxPrecio, includeInactive,
    sortBy = 'newest',
    page = 1,
    limit = 9,
  } = req.query

  const where = []
  const params = []

  if (!includeInactive) {
    where.push('p.activo = TRUE')
  }
  if (categoria) {
    where.push('p.idCat = ?')
    params.push(categoria)
  }
  if (search) {
    where.push('(p.nombre LIKE ? OR p.descripcion LIKE ? OR p.marca LIKE ?)')
    params.push(`%${search}%`, `%${search}%`, `%${search}%`)
  }
  if (marca) {
    where.push('p.marca = ?')
    params.push(marca)
  }
  if (color) {
    where.push('p.color = ?')
    params.push(color)
  }
  if (minPrecio) {
    where.push('p.precio >= ?')
    params.push(minPrecio)
  }
  if (maxPrecio) {
    where.push('p.precio <= ?')
    params.push(maxPrecio)
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const orderMap = {
    newest:      'p.idPro DESC',
    'precio-asc': 'p.precio ASC',
    'precio-desc': 'p.precio DESC',
    'nombre-asc': 'p.nombre ASC',
    'nombre-desc': 'p.nombre DESC',
  }
  const orderClause = `ORDER BY ${orderMap[sortBy] || 'p.idPro DESC'}`

  // Total para calcular páginas
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM productos p ${whereClause}`,
    params
  )

  const pageNum  = Math.max(1, Number(page))
  const limitNum = Math.min(50, Math.max(1, Number(limit)))
  const offset   = (pageNum - 1) * limitNum
  const totalPages = Math.ceil(total / limitNum)

  const [rows] = await pool.query(
    `${SELECT_PRODUCTO_BASE} ${whereClause} ${orderClause} LIMIT ? OFFSET ?`,
    [...params, limitNum, offset]
  )

  return ok(res, {
    productos: rows.map(normalizeProducto),
    total: Number(total),
    page: pageNum,
    totalPages,
    limit: limitNum,
  })
})

const getProducto = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`${SELECT_PRODUCTO_BASE} WHERE p.idPro = ?`, [req.params.id])
  if (rows.length === 0) return fail(res, 'Producto no encontrado.', 404)
  return ok(res, normalizeProducto(rows[0]))
})

// POST /api/productos (admin) - crea producto + fila de inventario + galería opcional
const createProducto = asyncHandler(async (req, res) => {
  const {
    nombre, marca, descripcion, precio, color, talla,
    idCat, idProv, imagen_url, activo = true, stock = 0, imagenes = [],
  } = req.body

  if (!nombre || precio == null) return fail(res, 'nombre y precio son obligatorios.')

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    const [result] = await conn.query(
      `INSERT INTO productos (nombre, marca, descripcion, precio, color, talla, idCat, idProv, imagen_url, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre, marca || null, descripcion || null, precio, color || null, talla || null, idCat || null, idProv || null, imagen_url || null, activo]
    )
    const idPro = result.insertId

    await conn.query('INSERT INTO inventario (idPro, cantidad_disp) VALUES (?, ?)', [idPro, stock])

    if (Array.isArray(imagenes) && imagenes.length > 0) {
      const values = imagenes.map((url, i) => [idPro, url, i + 1])
      await conn.query('INSERT INTO producto_imagenes (idPro, url, orden) VALUES ?', [values])
    }

    await conn.commit()

    const [rows] = await pool.query(`${SELECT_PRODUCTO_BASE} WHERE p.idPro = ?`, [idPro])
    return created(res, normalizeProducto(rows[0]))
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
})

// PUT /api/productos/:id (admin) - no toca stock (para eso está PATCH /stock).
// FIX #4: en vez de COALESCE (que impide poner null en campos opcionales como marca/talla/color),
// solo actualizamos los campos que el frontend manda explícitamente en el body.
//
// FIX #8: el admin (ProductManagement.jsx) sí manda `imagenes` (array completo de URLs)
// en el body del PUT cuando edita un producto, pero antes este endpoint lo ignoraba
// silenciosamente porque 'imagenes' no estaba en CAMPOS_PERMITIDOS. Resultado: subir
// una foto nueva a un producto YA EXISTENTE nunca se guardaba en producto_imagenes,
// así que jamás aparecía en el detalle del catálogo (aunque sí funcionaba al crear un
// producto desde cero, porque createProducto sí inserta la galería). Ahora, si llega
// `imagenes`, reemplazamos la galería completa de ese producto dentro de la misma
// transacción del UPDATE.
const updateProducto = asyncHandler(async (req, res) => {
  const CAMPOS_PERMITIDOS = ['nombre','marca','descripcion','precio','color','talla','idCat','idProv','imagen_url','activo']

  const sets = []
  const vals = []

  for (const campo of CAMPOS_PERMITIDOS) {
    if (Object.prototype.hasOwnProperty.call(req.body, campo)) {
      sets.push(`${campo} = ?`)
      vals.push(req.body[campo] ?? null)
    }
  }

  const tieneImagenes = Object.prototype.hasOwnProperty.call(req.body, 'imagenes')
  const imagenes = tieneImagenes ? req.body.imagenes : null

  if (sets.length === 0 && !tieneImagenes) {
    return fail(res, 'No se enviaron campos para actualizar.')
  }

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    if (sets.length > 0) {
      vals.push(req.params.id)
      const [result] = await conn.query(
        `UPDATE productos SET ${sets.join(', ')} WHERE idPro = ?`,
        vals
      )
      if (result.affectedRows === 0) {
        await conn.rollback()
        return fail(res, 'Producto no encontrado.', 404)
      }
    } else {
      const [existe] = await conn.query('SELECT idPro FROM productos WHERE idPro = ?', [req.params.id])
      if (existe.length === 0) {
        await conn.rollback()
        return fail(res, 'Producto no encontrado.', 404)
      }
    }

    if (tieneImagenes) {
      await conn.query('DELETE FROM producto_imagenes WHERE idPro = ?', [req.params.id])
      if (Array.isArray(imagenes) && imagenes.length > 0) {
        const values = imagenes.map((url, i) => [req.params.id, url, i + 1])
        await conn.query('INSERT INTO producto_imagenes (idPro, url, orden) VALUES ?', [values])
      }
    }

    await conn.commit()
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }

  const [rows] = await pool.query(`${SELECT_PRODUCTO_BASE} WHERE p.idPro = ?`, [req.params.id])
  return ok(res, normalizeProducto(rows[0]))
})

// DELETE /api/productos/:id (admin) — soft delete: marca el producto como
// inactivo en vez de eliminarlo físicamente. Esto preserva la integridad
// referencial con detallepedido (pedidos históricos que referencian este idPro
// seguirán siendo legibles en el historial del cliente y en los reportes admin).
// El catálogo público filtra por activo = TRUE, así que el producto deja de
// aparecer de inmediato sin romper nada.
const deleteProducto = asyncHandler(async (req, res) => {
  const [result] = await pool.query(
    'UPDATE productos SET activo = FALSE WHERE idPro = ?',
    [req.params.id]
  )
  if (result.affectedRows === 0) return fail(res, 'Producto no encontrado.', 404)
  return ok(res, { deleted: true, idPro: Number(req.params.id) })
})

// PATCH /api/productos/:id/stock (admin) - usado por StockManagement
// body: { cantidad_disp } para fijar el valor, o { ajuste } para sumar/restar
const updateStock = asyncHandler(async (req, res) => {
  const { cantidad_disp, ajuste, ubicacion } = req.body

  if (cantidad_disp != null) {
    await pool.query(
      'UPDATE inventario SET cantidad_disp = ?, ubicacion = COALESCE(?, ubicacion) WHERE idPro = ?',
      [cantidad_disp, ubicacion, req.params.id]
    )
  } else if (ajuste != null) {
    await pool.query(
      'UPDATE inventario SET cantidad_disp = GREATEST(0, cantidad_disp + ?) WHERE idPro = ?',
      [ajuste, req.params.id]
    )
  } else {
    return fail(res, 'Debes enviar cantidad_disp o ajuste.')
  }

  const [rows] = await pool.query(
    'SELECT idPro, cantidad_disp AS stock, ubicacion FROM inventario WHERE idPro = ?',
    [req.params.id]
  )
  if (rows.length === 0) return fail(res, 'Ese producto no tiene registro de inventario.', 404)
  return ok(res, rows[0])
})

// POST /api/productos/:id/imagenes (admin) - agrega una imagen a la galería
const addImagen = asyncHandler(async (req, res) => {
  const { url, orden } = req.body
  if (!url) return fail(res, 'url es obligatoria.')

  const [result] = await pool.query(
    'INSERT INTO producto_imagenes (idPro, url, orden) VALUES (?, ?, ?)',
    [req.params.id, url, orden ?? 0]
  )
  return created(res, { idImg: result.insertId, idPro: Number(req.params.id), url, orden: orden ?? 0 })
})

// DELETE /api/productos/:id/imagenes/:idImg (admin)
const deleteImagen = asyncHandler(async (req, res) => {
  const [result] = await pool.query(
    'DELETE FROM producto_imagenes WHERE idImg = ? AND idPro = ?',
    [req.params.idImg, req.params.id]
  )
  if (result.affectedRows === 0) return fail(res, 'Imagen no encontrada.', 404)
  return ok(res, { deleted: true })
})

module.exports = {
  listProductos, getProducto, createProducto, updateProducto, deleteProducto,
  updateStock, addImagen, deleteImagen,
}
