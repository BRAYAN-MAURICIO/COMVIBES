const mysql = require('mysql2/promise')
require('dotenv').config()

// Pool de conexiones reutilizables hacia combives_db.
// Usamos promesas para poder hacer async/await en todos los controllers.
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'combives_db',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true, // evita que mysql2 devuelva objetos Date con zona horaria rara
})

// Prueba de conexión al arrancar el server, para fallar rápido si algo está mal.
async function testConnection() {
  try {
    const conn = await pool.getConnection()
    console.log(`✅ Conectado a MySQL (${process.env.DB_NAME || 'combives_db'})`)
    conn.release()
  } catch (err) {
    console.error('❌ No se pudo conectar a MySQL:', err.message)
    process.exit(1)
  }
}


pool.on('connection', (conn) => {
  conn.query('SET SESSION group_concat_max_len = 100000')
})

module.exports = { pool, testConnection }
