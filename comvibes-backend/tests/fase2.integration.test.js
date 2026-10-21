// Pruebas de integración de la fase 2 de la auditoría ISO (2026-09-26):
// H5 (validación), H6 (precio vigente), H9 (límite de PQR), H12 (bitácora),
// H16 (productos inactivos) y H17 (cambio de rol).
//
// Usan la base de PRUEBAS: ver cómo prepararla en fase1.integration.test.js.

const request = require('supertest')
const app = require('../src/app')
const { pool } = require('../src/config/db')
const h = require('./helpers')

const { describeDB } = h
let admin, cliente, idPro

const conToken = (u) => ({ Authorization: `Bearer ${u.token}` })

async function nuevaDireccion(u) {
  const res = await request(app).post('/api/direcciones').set(conToken(u)).send({ direccion: 'Cra 5 # 10-20', ciudad: 'Neiva' })
  return res.body.data.idDir
}

async function ultimaAuditoria(entidad, idEntidad) {
  const res = await request(app).get('/api/auditoria').set(conToken(admin)).query({ entidad, idEntidad })
  return res.body.data.registros[0]
}

describeDB('Fase 2 de la auditoría ISO (con base de datos)', () => {
  beforeAll(async () => {
    const sufijo = Date.now()
    admin = await h.crearUsuario(`admin.f2.${sufijo}@test.com`, 'admin')
    cliente = await h.crearUsuario(`cliente.f2.${sufijo}@test.com`, 'cliente')
    idPro = await h.productoConStock(30)
  })

  afterAll(async () => {
    await pool.end()
  })

  describe('H5 — validación de entradas', () => {
    beforeEach(async () => {
      await request(app).delete('/api/carrito').set(conToken(cliente))
    })

    it('una cantidad enviada como texto se suma como número, no se concatena', async () => {
      await request(app).post('/api/carrito/items').set(conToken(cliente)).send({ idPro, cantidad: 1 })
      const res = await request(app).post('/api/carrito/items').set(conToken(cliente)).send({ idPro, cantidad: '2' })
      expect(res.status).toBe(200)
      expect(res.body.data.items.find((i) => i.idPro === idPro).cantidad).toBe(3) // antes daba 12
    })

    it('rechaza cantidades negativas o decimales en el carrito', async () => {
      const neg = await request(app).post('/api/carrito/items').set(conToken(cliente)).send({ idPro, cantidad: -3 })
      const dec = await request(app).post('/api/carrito/items').set(conToken(cliente)).send({ idPro, cantidad: 1.5 })
      expect(neg.status).toBe(400)
      expect(dec.status).toBe(400)
      expect(dec.body.message).toMatch(/entero/)
    })

    it('rechaza un precio negativo y un stock negativo', async () => {
      const precio = await request(app).post('/api/productos').set(conToken(admin)).send({ nombre: 'X', precio: -10 })
      const stock = await request(app).patch(`/api/productos/${idPro}/stock`).set(conToken(admin)).send({ cantidad_disp: -5 })
      expect(precio.status).toBe(400)
      expect(precio.body.details.campos[0].campo).toBe('precio')
      expect(stock.status).toBe(400)
    })

    it('rechaza un estado de envío fuera del enum', async () => {
      const res = await request(app).put('/api/envios/pedido/1').set(conToken(admin)).send({ estado_envio: 'Perdido' })
      expect(res.status).toBe(400)
      expect(res.body.message).toMatch(/estado_envio debe ser uno de/)
    })

    it('rechaza una calificación decimal', async () => {
      const res = await request(app).post('/api/opiniones').set(conToken(cliente)).send({ idPro, calificacion: 4.5 })
      expect(res.status).toBe(400)
    })

    it('descarta campos que el formulario no ofrece', async () => {
      // `usuario` y `estado` no son editables desde el perfil: se ignoran.
      const res = await request(app)
        .put('/api/usuarios/mi-perfil')
        .set(conToken(cliente))
        .send({ nombre: 'Nombre Nuevo', estado: 'bloqueado', rol: 'admin' })
      expect(res.status).toBe(200)
      expect(res.body.data.nombre).toBe('Nombre Nuevo')
      expect(res.body.data.rol).toBe('cliente')
      expect(res.body.data.estado_cuenta).toBe('activo')
    })

    it('un campo de fecha vacío no rompe la actualización del envío', async () => {
      const { idPed } = await h.comprar(app, cliente, idPro, 1)
      const res = await request(app)
        .put(`/api/envios/pedido/${idPed}`)
        .set(conToken(admin))
        .send({ transportadora: 'Servientrega', numero_guia: '123', fecha_estimada: '' })
      expect(res.status).toBe(200)
      expect(res.body.data.transportadora).toBe('Servientrega')
    })
  })

  describe('H6 — el checkout cobra el precio vigente', () => {
    let idDir, idMet

    beforeAll(async () => {
      idDir = await nuevaDireccion(cliente)
      idMet = await h.metodoActivo()
    })
    beforeEach(async () => {
      await request(app).delete('/api/carrito').set(conToken(cliente))
    })

    it('si el precio cambió después de agregar al carrito, el total esperado viejo se rechaza (409)', async () => {
      await pool.query('UPDATE productos SET precio = 50000 WHERE idPro = ?', [idPro])
      await request(app).post('/api/carrito/items').set(conToken(cliente)).send({ idPro, cantidad: 2 })
      await pool.query('UPDATE productos SET precio = 60000 WHERE idPro = ?', [idPro])

      const res = await request(app).post('/api/pedidos').set(conToken(cliente)).send({ idDir, idMet, totalEsperado: 100000 })
      expect(res.status).toBe(409)
      expect(res.body.details.motivo).toBe('total_cambio')
      expect(res.body.details.totalActual).toBe(120000)
    })

    it('con el total vigente la compra pasa y se cobra el precio actual', async () => {
      await pool.query('UPDATE productos SET precio = 50000 WHERE idPro = ?', [idPro])
      await request(app).post('/api/carrito/items').set(conToken(cliente)).send({ idPro, cantidad: 2 })
      await pool.query('UPDATE productos SET precio = 60000 WHERE idPro = ?', [idPro])

      const carrito = await request(app).get('/api/carrito').set(conToken(cliente))
      expect(carrito.body.data.items[0].precio).toBe(60000)
      expect(carrito.body.data.items[0].precio_agregado).toBe(50000)

      const res = await request(app).post('/api/pedidos').set(conToken(cliente)).send({ idDir, idMet, totalEsperado: 120000 })
      expect(res.status).toBe(201)
      expect(Number(res.body.data.total)).toBe(120000)
    })

    it('no acepta un método de pago desactivado', async () => {
      await request(app).post('/api/carrito/items').set(conToken(cliente)).send({ idPro, cantidad: 1 })
      const [m] = await pool.query("INSERT INTO metodospago (nombre, activo) VALUES (?, FALSE)", [`Inactivo ${Date.now()}`])
      const res = await request(app).post('/api/pedidos').set(conToken(cliente)).send({ idDir, idMet: m.insertId })
      expect(res.status).toBe(400)
      expect(res.body.message).toMatch(/método de pago/)
    })
  })

  describe('H16 — productos inactivos', () => {
    let idInactivo

    beforeAll(async () => {
      const res = await request(app).post('/api/productos').set(conToken(admin)).send({ nombre: `Oculto ${Date.now()}`, precio: 1000, stock: 1 })
      idInactivo = res.body.data.idPro
      await request(app).delete(`/api/productos/${idInactivo}`).set(conToken(admin))
    })

    it('un visitante no los ve ni con includeInactive ni por id', async () => {
      const lista = await request(app).get('/api/productos').query({ includeInactive: 1, limit: 50 })
      expect(lista.body.data.productos.some((p) => p.idPro === idInactivo)).toBe(false)
      const uno = await request(app).get(`/api/productos/${idInactivo}`)
      expect(uno.status).toBe(404)
    })

    it('el admin sí los ve', async () => {
      const uno = await request(app).get(`/api/productos/${idInactivo}`).set(conToken(admin))
      expect(uno.status).toBe(200)
      expect(uno.body.data.activo).toBe(false)
    })
  })

  describe('H12 y H17 — bitácora y cambio de rol', () => {
    it('cancelar un pedido queda en la bitácora con el estado anterior y el nuevo', async () => {
      const { idPed } = await h.comprar(app, cliente, idPro, 1)
      await request(app).patch(`/api/pedidos/${idPed}/estado`).set(conToken(admin)).send({ estado: 'Cancelado' })
      const reg = await ultimaAuditoria('pedido', idPed)
      expect(reg.accion).toBe('pedido.estado')
      expect(reg.idUsu).toBe(admin.idUsu)
      expect(reg.detalle).toEqual({ antes: { estado: 'Pendiente' }, despues: { estado: 'Cancelado' } })
    })

    it('un cambio de precio registra el valor anterior y el nuevo', async () => {
      await pool.query('UPDATE productos SET precio = 70000 WHERE idPro = ?', [idPro])
      await request(app).put(`/api/productos/${idPro}`).set(conToken(admin)).send({ precio: 75000 })
      const reg = await ultimaAuditoria('producto', idPro)
      expect(reg.accion).toBe('producto.editar')
      expect(reg.detalle).toEqual({ antes: { precio: 70000 }, despues: { precio: 75000 } })
    })

    it('cambiar el rol es atómico y queda registrado', async () => {
      const otro = await h.crearUsuario(`rol.f2.${Date.now()}@test.com`, 'cliente')
      const res = await request(app).patch(`/api/usuarios/${otro.idUsu}/rol`).set(conToken(admin)).send({ rol: 'admin' })
      expect(res.status).toBe(200)
      expect(res.body.data.rol).toBe('admin')
      const [roles] = await pool.query('SELECT COUNT(*) AS n FROM usuariorol WHERE idUsu = ?', [otro.idUsu])
      expect(Number(roles[0].n)).toBe(1)
      const reg = await ultimaAuditoria('usuario', otro.idUsu)
      expect(reg.detalle).toEqual({ antes: { rol: 'cliente' }, despues: { rol: 'admin' } })
    })

    it('un cliente no puede leer la bitácora', async () => {
      const res = await request(app).get('/api/auditoria').set(conToken(cliente))
      expect(res.status).toBe(403)
    })
  })

  describe('H9 — límite de PQR', () => {
    it('un correo inválido se rechaza y la sexta PQR seguida desde la misma IP da 429', async () => {
      const invalido = await request(app).post('/api/soporte').send({ asunto: 'A', descripcion: 'B', nombre: 'Ana', correo: 'no-es-correo' })
      expect(invalido.status).toBe(400)

      const estados = []
      for (let i = 0; i < 5; i++) {
        const r = await request(app).post('/api/soporte').send({ asunto: `Prueba ${i}`, descripcion: 'Texto', nombre: 'Ana', correo: 'ana@test.com' })
        estados.push(r.status)
      }
      // 1 inválida + 4 válidas = 5 permitidas; la sexta petición ya se corta.
      expect(estados.slice(0, 4)).toEqual([201, 201, 201, 201])
      expect(estados[4]).toBe(429)
    })
  })
})
