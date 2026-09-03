require('dotenv').config()
const app = require('./src/app')
const { testConnection } = require('./src/config/db')

const PORT = process.env.PORT || 4000

async function start() {
  await testConnection()
  app.listen(PORT, () => {
    console.log(`🚀 ComVibes API corriendo en http://localhost:${PORT}`)
  })
}

start()
