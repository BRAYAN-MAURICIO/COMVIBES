// Envuelve un controller async para que cualquier error caído se mande
// directo al errorHandler de Express, sin tener que repetir try/catch
// en los 17 recursos del API.
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

module.exports = asyncHandler
