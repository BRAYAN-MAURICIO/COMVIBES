const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const helmet = require('helmet')
require('dotenv').config()

const { errorHandler, notFoundHandler } = require('./middleware/errorHandler')

const app = express()

// El fallback a localhost:5173 solo tiene sentido en desarrollo. Si alguien
// despliega a producción sin definir CORS_ORIGIN explícitamente (por ejemplo
// porque copió .env.example y no lo cambió), preferimos que el arranque
// falle con un error claro a que el backend quede silenciosamente aceptando
// solo peticiones desde localhost — o que alguien "arregle" eso más tarde
// poniendo un origen abierto sin pensarlo.
if (process.env.NODE_ENV === 'production' && !process.env.CORS_ORIGIN) {
  throw new Error(
    'CORS_ORIGIN no está definido. En producción debes fijarlo explícitamente al dominio del frontend (no se permite el valor por defecto de desarrollo).'
  )
}

// Admite uno o varios orígenes separados por coma (ej. dominio propio + www).
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())

// FIX (RA.05 - recomendación instructor): helmet fija cabeceras HTTP de
// seguridad estándar (HSTS, X-Frame-Options, X-Content-Type-Options, etc.).
// - contentSecurityPolicy: off. Este backend es una API JSON, no sirve HTML
//   propio; la CSP por defecto de helmet está pensada para páginas
//   renderizadas y aquí solo generaría ruido sin beneficio real.
// - crossOriginResourcePolicy: 'cross-origin'. Las imágenes de /uploads las
//   consume el frontend React desde OTRO origen (Vite en :5173, o el dominio
//   de producción); la política por defecto de helmet ('same-origin')
//   bloquearía justamente eso.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
)
app.use(cors({ origin: allowedOrigins }))
app.use(express.json())
// FIX #11: 'dev' es verboso con colores ANSI — útil localmente, ruido en logs de producción.
// En pruebas no se registra cada petición: solo ensucia la salida de Jest.
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))
}

// Servir imágenes subidas por el admin como archivos estáticos.
// Cualquiera puede leer las imágenes (son públicas), pero solo el
// admin puede subirlas (el endpoint /api/uploads/imagen lo valida).
// FIX #7: index:false evita listar el contenido del directorio si se navega a /uploads/
// directamente. dotfiles:'deny' bloquea archivos ocultos (ej. .htaccess).
app.use('/uploads', require('express').static(require('path').join(__dirname, '../uploads'), {
  index: false,
  dotfiles: 'deny',
}))

// Comprueba la conexión SMTP al arrancar. No bloquea el arranque: si falla,
// solo deja el aviso en consola, para no descubrir el problema cuando un
// usuario real intente registrarse o recuperar su contraseña.
if (process.env.NODE_ENV !== 'test') require('./utils/mailer').verificarConexion()

// Aviso temprano si falta alguna migración. Sin ellas los errores llegan al
// navegador como "Unknown column ..." o como un 500 genérico, que no dicen
// nada útil. Cada entrada: la columna (o tabla) que crea y qué se rompe sin ella.
const MIGRACIONES = [
  { archivo: '02_email_real.sql', tabla: 'credencial', columna: 'correo_verificado', efecto: 'El login y el registro fallarán.' },
  { archivo: '03_soporte_seguimiento.sql', tabla: 'soporte', columna: 'atendido_por', efecto: 'Responder PQR fallará.' },
  { archivo: '04_integridad_fk.sql', tabla: 'credencial', columna: 'password_changed_at', efecto: 'Ninguna petición autenticada funcionará.' },
  { archivo: '05_auditoria_admin.sql', tabla: 'auditoria_admin', columna: null, efecto: 'Las acciones de admin no quedarán registradas.' },
]

;(async () => {
  // En pruebas la base la prepara scripts/prepararBdPruebas.js, que ya
  // aplica todas las migraciones; además esta consulta dejaría una conexión
  // abierta que Jest reporta al terminar.
  if (process.env.NODE_ENV === 'test') return
  try {
    const { pool } = require('./config/db')
    for (const m of MIGRACIONES) {
      const [filas] = m.columna
        ? await pool.query(
            `SELECT 1 FROM information_schema.COLUMNS
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
            [m.tabla, m.columna]
          )
        : await pool.query(
            'SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
            [m.tabla]
          )
      if (filas.length === 0) {
        console.error(`\n[schema] ⚠  Falta la migración sql/${m.archivo}. ${m.efecto}`)
        console.error(`[schema]    mysql -u root -p combives_db < sql/${m.archivo}\n`)
      }
    }
  } catch (_) {
    // Si la BD todavía no responde, server.js ya avisa por su cuenta.
  }
})()

app.get('/api/health', (req, res) => res.json({ success: true, message: 'ComVibes API viva 🚀' }))

app.use('/api/auth', require('./routes/auth.routes'))
app.use('/api/usuarios', require('./routes/usuarios.routes'))
app.use('/api/categorias', require('./routes/categorias.routes'))
app.use('/api/productos', require('./routes/productos.routes'))
app.use('/api/proveedores', require('./routes/proveedores.routes'))
app.use('/api/direcciones', require('./routes/direcciones.routes'))
app.use('/api/carrito', require('./routes/carrito.routes'))
app.use('/api/wishlist', require('./routes/wishlist.routes'))
app.use('/api/pedidos', require('./routes/pedidos.routes'))
app.use('/api/pagos', require('./routes/pagos.routes'))
app.use('/api/metodos-pago', require('./routes/metodospago.routes'))
app.use('/api/envios', require('./routes/envios.routes'))
app.use('/api/facturas', require('./routes/facturas.routes'))
app.use('/api/notificaciones', require('./routes/notificaciones.routes'))
app.use('/api/opiniones', require('./routes/opiniones.routes'))
app.use('/api/soporte', require('./routes/soporte.routes'))
app.use('/api/reportes', require('./routes/reportes.routes'))
app.use('/api/uploads', require('./routes/uploads.routes'))
app.use('/api/auditoria', require('./routes/auditoria.routes'))

app.use(notFoundHandler)
app.use(errorHandler)

module.exports = app
