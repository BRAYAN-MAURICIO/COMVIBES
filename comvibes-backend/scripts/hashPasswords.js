// El Comvibes_bas_actualizado.sql original inserta las contraseñas de prueba
// (admin123, cliente123) en texto plano dentro de credencial.contrasena_hash.
// Esas contraseñas quedan escritas en el repo (los .sql), así que dejarlas
// tal cual, aunque estén hasheadas, significa que cualquiera que lea el
// código sigue conociendo la contraseña real de las cuentas admin/cliente.
//
// Por eso este script NO hashea el valor que trae el .sql: genera una
// contraseña aleatoria nueva para cada cuenta, la hashea con bcrypt, y solo
// la muestra una vez en la consola de quien lo ejecuta. Así el repo nunca
// contiene una contraseña real utilizable.
//
// Uso: npm run seed:hash   (una sola vez, después de correr los .sql)
const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const { pool } = require('../src/config/db')

function generarPasswordAleatoria() {
  // 16 bytes -> string base64url de ~22 caracteres, suficiente entropía
  // y sin caracteres raros que compliquen copiar/pegar.
  return crypto.randomBytes(16).toString('base64url')
}

async function esYaUnHashBcrypt(valor) {
  // Los hashes de bcrypt siempre empiezan con $2a$, $2b$ o $2y$
  return /^\$2[aby]\$/.test(valor)
}

async function run() {
  const [rows] = await pool.query('SELECT idCred, correo, contrasena_hash FROM credencial')

  const credencialesGeneradas = []
  for (const row of rows) {
    if (await esYaUnHashBcrypt(row.contrasena_hash)) continue // ya está hasheada, no tocar

    const passwordNueva = generarPasswordAleatoria()
    const hash = await bcrypt.hash(passwordNueva, 10)
    await pool.query('UPDATE credencial SET contrasena_hash = ? WHERE idCred = ?', [hash, row.idCred])
    credencialesGeneradas.push({ correo: row.correo, password: passwordNueva })
  }

  if (credencialesGeneradas.length === 0) {
    console.log('Nada que hacer: todas las contraseñas ya estaban hasheadas.')
  } else {
    console.log('Contraseñas generadas (guárdalas ahora, no se muestran de nuevo):\n')
    for (const { correo, password } of credencialesGeneradas) {
      console.log(`  ${correo} -> ${password}`)
    }
    console.log(`\n${credencialesGeneradas.length} cuenta(s) actualizada(s) de ${rows.length} totales.`)
  }

  process.exit(0)
}

run().catch((err) => {
  console.error('❌ Error hasheando contraseñas:', err)
  process.exit(1)
})
