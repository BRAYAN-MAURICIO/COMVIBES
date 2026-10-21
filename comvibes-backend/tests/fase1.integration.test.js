// Pruebas de integración de la fase 1 de la auditoría ISO (2026-09-26):
// H1 (cuentas no activas), H2 (cancelar pedidos) y H3 (integridad referencial).
//
// Usan una base de datos real y la modifican. Corren contra la base de
// PRUEBAS (combives_db_test), nunca contra la de desarrollo:
//
//   npm run test:db:preparar   # crea combives_db_test desde sql/
//   npm run test:db            # corre todas las pruebas, incluidas estas
//
// Con `npm test` a secas se omiten, para que funcione sin MySQL.
const request = require('supertest')
const app = require('../src/app')
const { pool } = require('../src/config/db')
const h = require('./helpers')

const { PASS, describeDB, stockDe } = h
let admin, cliente, adminToken, clienteToken

const crearUsuario = h.crearUsuario
const tokenDe = h.tokenDe
const comprar = (idPro, cantidad) => h.comprar(app, cliente, idPro, cantidad)

const cambiarEstado = (idPed, estado) =>
  request(app)
    .patch(`/api/pedidos/${idPed}/estado`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ estado })

describeDB('Fase 1 de la auditoría ISO (con base de datos)', () => {
  let idPro

  beforeAll(async () => {
    const sufijo = Date.now()
    admin = await crearUsuario(`admin.qa.${sufijo}@test.com`, 'admin')
    cliente = await crearUsuario(`cliente.qa.${sufijo}@test.com`, 'cliente')
    adminToken = tokenDe(admin, 'admin')
    clienteToken = tokenDe(cliente, 'cliente')

    idPro = await h.productoConStock(20)
  })

  afterAll(async () => {
    await pool.end()
  })

  describe('H1 — cuentas no activas', () => {
    afterEach(async () => {
      await pool.query("UPDATE credencial SET estado = 'activo' WHERE idUsu = ?", [cliente.idUsu])
    })

    it('un token vigente de una cuenta bloqueada deja de servir (403)', async () => {
      await pool.query("UPDATE credencial SET estado = 'bloqueado' WHERE idUsu = ?", [cliente.idUsu])
      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${clienteToken}`)
      expect(res.status).toBe(403)
      expect(res.body.details).toEqual({ estadoCuenta: 'bloqueado' })
    })

    it('una cuenta inactiva no puede iniciar sesión', async () => {
      await pool.query("UPDATE credencial SET estado = 'inactivo' WHERE idUsu = ?", [cliente.idUsu])
      const res = await request(app).post('/api/auth/login').send({ correo: cliente.correo, password: PASS })
      expect(res.status).toBe(403)
      expect(res.body.message).toMatch(/inactiva/i)
    })

    it('con contraseña incorrecta no revela que la cuenta está bloqueada', async () => {
      await pool.query("UPDATE credencial SET estado = 'bloqueado' WHERE idUsu = ?", [cliente.idUsu])
      const res = await request(app).post('/api/auth/login').send({ correo: cliente.correo, password: 'otraCosa123' })
      expect(res.status).toBe(401)
      expect(res.body.message).not.toMatch(/bloqueada/i)
    })

    it('una cuenta activa sigue entrando normal', async () => {
      const res = await request(app).post('/api/auth/login').send({ correo: cliente.correo, password: PASS })
      expect(res.status).toBe(200)
      expect(res.body.data.token).toBeTruthy()
    })

    it('un admin no puede bloquearse a sí mismo', async () => {
      const res = await request(app)
        .patch(`/api/usuarios/${admin.idUsu}/estado`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ estado: 'bloqueado' })
      expect(res.status).toBe(409)
    })
  })

  describe('H2 — cancelar pedidos', () => {
    it('cancelar devuelve las unidades al inventario', async () => {
      const antes = await stockDe(idPro)
      const { idPed } = await comprar(idPro, 3)
      expect(await stockDe(idPro)).toBe(antes - 3)

      const res = await cambiarEstado(idPed, 'Cancelado')
      expect(res.status).toBe(200)
      expect(await stockDe(idPro)).toBe(antes)
    })

    it('un pedido Cancelado no puede volver a otro estado ni reponer dos veces', async () => {
      const { idPed } = await comprar(idPro, 2)
      await cambiarEstado(idPed, 'Cancelado')
      const stock = await stockDe(idPro)

      const res = await cambiarEstado(idPed, 'Entregado')
      expect(res.status).toBe(409)
      expect(res.body.details.estadoActual).toBe('Cancelado')

      const repetido = await cambiarEstado(idPed, 'Cancelado')
      expect(repetido.status).toBe(200)
      expect(await stockDe(idPro)).toBe(stock)
    })

    it('un pedido Pendiente no salta directo a Entregado', async () => {
      const { idPed } = await comprar(idPro, 1)
      const res = await cambiarEstado(idPed, 'Entregado')
      expect(res.status).toBe(409)
      expect(res.body.details.permitidos).toEqual(['En Camino', 'Cancelado'])
    })

    it('el flujo normal Pendiente → En Camino → Entregado sigue funcionando', async () => {
      const { idPed } = await comprar(idPro, 1)
      expect((await cambiarEstado(idPed, 'En Camino')).status).toBe(200)
      const res = await cambiarEstado(idPed, 'Entregado')
      expect(res.status).toBe(200)
      expect(res.body.data.estado).toBe('Entregado')
    })
  })

  describe('H3 — integridad referencial', () => {
    it('se puede borrar una dirección usada en un pedido; el envío queda sin dirección', async () => {
      const { idPed, idDir } = await comprar(idPro, 1)
      const res = await request(app)
        .delete(`/api/direcciones/${idDir}`)
        .set('Authorization', `Bearer ${clienteToken}`)
      expect(res.status).toBe(200)

      const [[envio]] = await pool.query('SELECT idDir FROM envios WHERE idPed = ?', [idPed])
      expect(envio.idDir).toBeNull()
    })

    it('borrar un usuario con pedidos responde 409 y sugiere bloquearlo', async () => {
      const res = await request(app)
        .delete(`/api/usuarios/${cliente.idUsu}`)
        .set('Authorization', `Bearer ${adminToken}`)
      expect(res.status).toBe(409)
      expect(res.body.details.sugerencia).toBe('bloquear')
      expect(res.body.details.pedidos).toBeGreaterThan(0)
    })

    it('cambiar la contraseña funciona e invalida los tokens anteriores', async () => {
      const nuevo = await crearUsuario(`cambio.pass.${Date.now()}@test.com`, 'cliente')
      const tokenViejo = tokenDe(nuevo, 'cliente')
      const res = await request(app)
        .patch('/api/usuarios/mi-perfil/password')
        .set('Authorization', `Bearer ${tokenViejo}`)
        .send({ passwordActual: PASS, passwordNueva: 'OtraClave987' })
      expect(res.status).toBe(200)

      // password_changed_at tiene resolución de segundos: esperar al siguiente
      await new Promise((r) => setTimeout(r, 1100))
      const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${tokenViejo}`)
      expect(me.status).toBe(401)
    })

    it('un usuario sin historial sí se puede borrar', async () => {
      const nuevo = await crearUsuario(`sin.historial.${Date.now()}@test.com`, 'cliente')
      const res = await request(app)
        .delete(`/api/usuarios/${nuevo.idUsu}`)
        .set('Authorization', `Bearer ${adminToken}`)
      expect(res.status).toBe(200)
    })
  })
})
