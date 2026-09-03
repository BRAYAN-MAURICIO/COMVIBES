const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
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

app.use(cors({ origin: allowedOrigins }))
app.use(express.json())
// FIX #11: 'dev' es verboso con colores ANSI — útil localmente, ruido en logs de producción.
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))

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
require('./utils/mailer').verificarConexion()

// Aviso temprano si falta la migración sql/02_email_real.sql. Sin ella el
// login y el registro fallan con "Unknown column 'correo_verificado'", un
// error que desde el navegador no dice nada útil.
;(async () => {
  try {
    const { pool } = require('./config/db')
    const [cols] = await pool.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'credencial'
          AND COLUMN_NAME = 'correo_verificado'`
    )
    if (cols.length === 0) {
      console.error('\n[schema] ⚠  Falta la migración sql/02_email_real.sql — no existe credencial.correo_verificado.')
      console.error('[schema]    El login y el registro fallarán hasta que la ejecutes:')
      console.error('[schema]    mysql -u root -p combives_db < sql/02_email_real.sql\n')
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

app.use(notFoundHandler)
app.use(errorHandler)

module.exports = app
