// Pruebas de los hallazgos de la revisión entre módulos (octubre 2026).
// Cada bloque reproduce el error tal como se encontró y comprueba el arreglo.
const request = require('supertest')
const app = require('../src/app')
const { pool } = require('../src/config/db')
const { describeDB, crearUsuario, productoConStock, metodoActivo, comprar } = require('./helpers')

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

  it('RV-4 · el checkout rechaza un producto que el admin desactivó después de agregarlo', async () => {
    const admin = await crearUsuario(unico('admin'), 'admin')
    const cliente = await crearUsuario(unico('cli'), 'cliente')
    const idPro = await productoConStock(20)
    const dir = await request(app).post('/api/direcciones').set(auth(cliente)).send({ direccion: 'Calle 1', ciudad: 'Neiva' })
    await request(app).post('/api/carrito/items').set(auth(cliente)).send({ idPro, cantidad: 1 })

    await request(app).delete(`/api/productos/${idPro}`).set(auth(admin)) // desactivar
    try {
      const r = await request(app).post('/api/pedidos').set(auth(cliente))
        .send({ idDir: dir.body.data.idDir, idMet: await metodoActivo() })
      expect(r.status).toBe(400)
      expect(r.body.message).toMatch(/ya no está disponible/)
      const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM pedidos WHERE idUsu = ?', [cliente.idUsu])
      expect(Number(n)).toBe(0)
    } finally {
      await pool.query('UPDATE productos SET activo = TRUE WHERE idPro = ?', [idPro])
    }
  })

  it('RV-5 · cancelar un pedido reembolsa el pago simulado', async () => {
    const admin = await crearUsuario(unico('admin'), 'admin')
    const cliente = await crearUsuario(unico('cli'), 'cliente')
    const { idPed } = await comprar(app, cliente, await productoConStock(20), 1)

    const r = await request(app).patch(`/api/pedidos/${idPed}/estado`).set(auth(admin)).send({ estado: 'Cancelado' })
    expect(r.status).toBe(200)
    expect(r.body.data.pago.estado).toBe('Reembolsado')
  })
})
