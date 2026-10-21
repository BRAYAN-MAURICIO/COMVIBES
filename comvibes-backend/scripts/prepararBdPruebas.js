// Crea (o recrea desde cero) la base de datos de PRUEBAS a partir de los
// mismos .sql que usa la instalación real: Comvibes_db_final.sql y las
// migraciones 02 a 05. Auditoría ISO 2026-09-26, fase 3 (hallazgo H4).
//
// Los .sql traen `combives_db` escrito a mano; aquí se reemplaza por el
// nombre de la base de pruebas, así las pruebas nunca tocan la de desarrollo.
//
// Uso:  npm run test:db:preparar
// Toma DB_HOST, DB_PORT, DB_USER y DB_PASSWORD del .env; la base de pruebas
// es DB_NAME_TEST (por defecto combives_db_test).
//
// Por seguridad se niega a trabajar con un nombre que no termine en _test:
// este script BORRA la base que prepara.
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const mysql = require('mysql2/promise')

const NOMBRE = process.env.DB_NAME_TEST || 'combives_db_test'
const ARCHIVOS = [
  'Comvibes_db_final.sql',
  '02_email_real.sql',
  '03_soporte_seguimiento.sql',
  '04_integridad_fk.sql',
  '05_auditoria_admin.sql',
]

async function main() {
  if (!/_test$/.test(NOMBRE)) {
    throw new Error(`"${NOMBRE}" no termina en _test. Este script borra la base que prepara; no se usa con la de desarrollo.`)
  }

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
    charset: 'utf8mb4',
  })

  try {
    for (const archivo of ARCHIVOS) {
      const sql = fs
        .readFileSync(path.join(__dirname, '..', 'sql', archivo), 'utf8')
        .replace(/\bcombives_db\b/g, NOMBRE)
      await conn.query(sql)
      console.log(`✅ ${archivo}`)
    }
    console.log(`\nBase de pruebas lista: ${NOMBRE}`)
    console.log(`Corre las pruebas con:  npm run test:db\n`)
  } finally {
    await conn.end()
  }
}

main().catch((err) => {
  console.error('❌', err.message)
  process.exit(1)
})
