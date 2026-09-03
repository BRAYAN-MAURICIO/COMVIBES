// Traduce errores comunes de MySQL a mensajes entendibles en español,
// en vez de dejar que se filtre el stack trace crudo al frontend.
function errorHandler(err, req, res, next) {
  console.error(err)

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ success: false, message: 'Ese registro ya existe (valor duplicado).' })
  }
  if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_NO_REFERENCED_ROW') {
    return res.status(400).json({ success: false, message: 'Haces referencia a un registro que no existe (FK inválida).' })
  }
  if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
    // Detectar si es una dirección — mensaje más claro para el usuario
    const refersToDir = err.message?.includes('direcciones')
    const msg = refersToDir
      ? 'No puedes eliminar esta dirección porque tiene pedidos asociados. Aplica la migración 01_schema_updates.sql para habilitar esta operación.'
      : 'No se puede eliminar: hay registros relacionados que dependen de este.'
    return res.status(409).json({ success: false, message: msg })
  }

  const status = err.status || 500
  res.status(status).json({
    success: false,
    message: err.message || 'Error interno del servidor.',
  })
}

function notFoundHandler(req, res) {
  res.status(404).json({ success: false, message: `Ruta no encontrada: ${req.method} ${req.originalUrl}` })
}

module.exports = { errorHandler, notFoundHandler }
