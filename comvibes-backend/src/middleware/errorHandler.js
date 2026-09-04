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

  // FIX (RA.04 - Oportunidad de mejora, Módulo 4): antes reenviábamos
  // err.message tal cual para CUALQUIER error no clasificado, incluyendo
  // errores 500 de la base de datos o de librerías internas — eso filtra
  // detalles de implementación (nombres de tablas, columnas, drivers) al
  // cliente. Ahora: errores "esperados" que nosotros mismos lanzamos con un
  // status < 500 (ej. fail() en los controladores) sí muestran su mensaje,
  // porque están pensados para el usuario final. Cualquier error no
  // clasificado con status 500 devuelve un mensaje genérico; el detalle
  // técnico solo queda en el log del servidor (console.error de arriba).
  const message = status < 500
    ? (err.message || 'Error en la solicitud.')
    : 'Ocurrió un error interno en el servidor. Por favor intenta más tarde.'

  res.status(status).json({ success: false, message })
}

function notFoundHandler(req, res) {
  res.status(404).json({ success: false, message: `Ruta no encontrada: ${req.method} ${req.originalUrl}` })
}

module.exports = { errorHandler, notFoundHandler }
