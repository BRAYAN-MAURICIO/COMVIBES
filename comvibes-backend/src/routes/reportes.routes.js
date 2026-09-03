const { Router } = require('express')
const ctrl = require('../controllers/reportes.controller')
const { requireAuth, requireAdmin } = require('../middleware/auth')

const router = Router()

router.use(requireAuth, requireAdmin)

// Tarjetas globales del dashboard (sin rango)
router.get('/resumen', ctrl.resumen)

// Informe de ventas del rango: KPIs, comparativa, series y rankings
router.get('/ventas', ctrl.ventas)

// Mismo rango, exportado como CSV listo para Excel en español
router.get('/ventas.csv', ctrl.ventasCsv)

module.exports = router
