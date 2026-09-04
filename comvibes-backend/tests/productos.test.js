const request = require('supertest')
const app = require('../src/app')

describe('GET /api/health', () => {
  it('responde 200 con success: true', async () => {
    const res = await request(app).get('/api/health')

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })
})

describe('Gestión de productos (solo admin)', () => {
  it('POST /api/productos sin token responde 401', async () => {
    const res = await request(app).post('/api/productos').send({ nombre: 'Camiseta' })

    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })

  it('PUT /api/productos/:id sin token responde 401', async () => {
    const res = await request(app).put('/api/productos/1').send({ nombre: 'Camiseta' })

    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })

  it('DELETE /api/productos/:id sin token responde 401', async () => {
    const res = await request(app).delete('/api/productos/1')

    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })
})
