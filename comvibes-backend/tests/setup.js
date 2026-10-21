// Se ejecuta antes de cada archivo de pruebas (jest.config.js → setupFiles).
//
// Las pruebas SIEMPRE apuntan a la base de pruebas (DB_NAME_TEST, por
// defecto combives_db_test), nunca a la de desarrollo, aunque el .env diga
// otra cosa. Las de integración crean y borran datos.
require('dotenv').config()

const nombre = process.env.DB_NAME_TEST || 'combives_db_test'
if (!/_test$/.test(nombre)) {
  throw new Error(`DB_NAME_TEST="${nombre}" debe terminar en _test: las pruebas borran datos.`)
}
process.env.DB_NAME = nombre

process.env.JWT_SECRET = 'secreto-solo-para-pruebas'
process.env.MAIL_TRANSPORT = 'console'
process.env.NODE_ENV = 'test'
