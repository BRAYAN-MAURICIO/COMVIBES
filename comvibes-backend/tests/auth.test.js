// Pruebas de integración con Jest + Supertest (RA.05 - recomendación del
// instructor en la retroalimentación de RA.04).
//
// Alcance deliberado: solo cubren las validaciones que los controladores
// resuelven ANTES de tocar la base de datos (campos obligatorios, formato de
// password, etc.), para que este archivo pueda correr sin depender de que
// haya una instancia de MySQL levantada. Las pruebas que sí requieren datos
// reales (login exitoso, catálogo de productos, checkout) quedan como el
// siguiente paso natural, ahora que ya existe el arnés (app + supertest)
// listo para usarse: solo hace falta un usuario/base de datos de prueba.
//
// Para correrlas: npm test (agrega jest y supertest a package.json).
const request = require('supertest')
const app = require('../src/app')

describe('POST /api/auth/register', () => {
  it('rechaza el registro si faltan campos obligatorios', async () => {
    const res = await request(app).post('/api/auth/register').send({ correo: 'sin-datos@test.com' })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toMatch(/obligatorios/i)
  })

  it('rechaza una contraseña de menos de 8 caracteres', async () => {
    const res = await request(app).post('/api/auth/register').send({
      nombre: 'Ana',
      apellido: 'Pérez',
      correo: `ana.${Date.now()}@test.com`,
      password: '1234567',
    })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toMatch(/8 caracteres/i)
  })
})

describe('POST /api/auth/login', () => {
  it('rechaza el login si faltan correo o password', async () => {
    const res = await request(app).post('/api/auth/login').send({ correo: 'sin-clave@test.com' })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toMatch(/obligatorios/i)
  })
})

describe('GET /api/auth/me', () => {
  it('exige autenticación (401 sin token)', async () => {
    const res = await request(app).get('/api/auth/me')

    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })

  it('rechaza un token con formato inválido', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer token-falso')

    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })
})
