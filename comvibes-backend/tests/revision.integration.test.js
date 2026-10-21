// Pruebas de los hallazgos de la revisión entre módulos (octubre 2026).
// Cada bloque reproduce el error tal como se encontró y comprueba el arreglo.
const request = require('supertest')
const app = require('../src/app')
const { pool } = require('../src/config/db')
const { describeDB, crearUsuario } = require('./helpers')

const auth = (u) => ({ Authorization: `Bearer ${u.token}` })
const unico = (prefijo) => `${prefijo}.${Date.now()}.${Math.random().toString(36).slice(2, 7)}@test.com`

describeDB('Revisión entre módulos', () => {
  afterAll(() => pool.end())

  it('RV-1 · quitarle el rol de admin a alguien le corta el acceso aunque su token diga admin', async () => {
    const admin = await crearUsuario(unico('admin'), 'admin')
    const otro = await crearUsuario(unico('admin2'), 'admin')

    const cambio = await request(app).patch(`/api/usuarios/${otro.idUsu}/rol`).set(auth(admin)).send({ rol: 'cliente' })
    expect(cambio.status).toBe(200)

    // Mismo token de antes, que todavía dice rol: 'admin'
    const lista = await request(app).get('/api/usuarios').set(auth(otro))
    expect(lista.status).toBe(403)
  })

  it('RV-2 · el límite de recuperación de contraseña corta en la sexta solicitud de la hora', async () => {
    const estados = []
    for (let i = 0; i < 6; i++) {
      const r = await request(app).post('/api/auth/forgot-password').send({ correo: unico('nadie') })
      estados.push(r.status)
    }
    expect(estados.slice(0, 5)).toEqual([200, 200, 200, 200, 200])
    expect(estados[5]).toBe(429)
  })
})
