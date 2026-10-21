// Pruebas de los hallazgos de la revisión entre módulos (octubre 2026).
// Cada bloque reproduce el error tal como se encontró y comprueba el arreglo.
const request = require('supertest')
const app = require('../src/app')
const { pool } = require('../src/config/db')
const { describeDB, crearUsuario, productoConStock, metodoActivo, comprar, PASS } = require('./helpers')
const { signToken } = require('../src/utils/jwt')

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

  it('RV-6 · el estado del envío sigue al del pedido', async () => {
    const admin = await crearUsuario(unico('admin'), 'admin')
    const cliente = await crearUsuario(unico('cli'), 'cliente')
    const idPro = await productoConStock(20)
    const estadoEnvio = async (idPed) => {
      const [[e]] = await pool.query('SELECT estado_envio, fecha_envio FROM envios WHERE idPed = ?', [idPed])
      return e
    }
    const cambiar = (idPed, estado) =>
      request(app).patch(`/api/pedidos/${idPed}/estado`).set(auth(admin)).send({ estado })

    const { idPed } = await comprar(app, cliente, idPro, 1)
    expect((await estadoEnvio(idPed)).estado_envio).toBe('Pendiente')

    await cambiar(idPed, 'En Camino')
    const enviado = await estadoEnvio(idPed)
    expect(enviado.estado_envio).toBe('Enviado')
    expect(enviado.fecha_envio).toBeTruthy()

    await cambiar(idPed, 'Pendiente') // corrección de un clic equivocado
    expect(await estadoEnvio(idPed)).toEqual({ estado_envio: 'Pendiente', fecha_envio: null })

    await cambiar(idPed, 'En Camino')
    await cambiar(idPed, 'Entregado')
    expect((await estadoEnvio(idPed)).estado_envio).toBe('Entregado')

    // Cancelar con el paquete ya en camino lo marca como devuelto
    const { idPed: otro } = await comprar(app, cliente, idPro, 1)
    await cambiar(otro, 'En Camino')
    await cambiar(otro, 'Cancelado')
    expect((await estadoEnvio(otro)).estado_envio).toBe('Devuelto')
  })

  // Estas dos pruebas fallaban cuando el proceso de Node y MySQL estaban en
  // zonas horarias distintas (correr con TZ=America/Bogota contra una base en UTC).
  it('RV-7 · tras cambiar la contraseña, el token viejo se rechaza y uno nuevo funciona', async () => {
    const cliente = await crearUsuario(unico('cli'), 'cliente')
    const cambio = await request(app).patch('/api/usuarios/mi-perfil/password').set(auth(cliente))
      .send({ passwordActual: PASS, passwordNueva: 'OtraClave12345' })
    expect(cambio.status).toBe(200)

    const viejo = await request(app).get('/api/auth/me').set(auth(cliente))
    expect(viejo.status).toBe(401)

    await new Promise((r) => setTimeout(r, 1100)) // un login posterior al cambio
    const nuevo = signToken({ idUsu: cliente.idUsu, correo: cliente.correo, rol: 'cliente' })
    const me = await request(app).get('/api/auth/me').set({ Authorization: `Bearer ${nuevo}` })
    expect(me.status).toBe(200)
  })

  it('RV-7 · el código de verificación vence a los 10 minutos según el reloj de MySQL', async () => {
    // Se usa el registro y no forgot-password porque RV-2 ya agotó el límite
    // de recuperación para esta IP (el limitador vive en memoria).
    const correo = unico('nuevo')
    const reg = await request(app).post('/api/auth/register')
      .send({ nombre: 'Ana', apellido: 'Ruiz', correo, password: 'Segura12345' })
    expect(reg.status).toBe(201)
    const [[f]] = await pool.query(
      `SELECT TIMESTAMPDIFF(SECOND, NOW(), v.expira_en) AS restante
         FROM email_verifications v JOIN credencial c ON c.idUsu = v.idUsu
        WHERE c.correo = ? ORDER BY v.idVer DESC LIMIT 1`,
      [correo]
    )
    expect(Number(f.restante)).toBeGreaterThan(590)
    expect(Number(f.restante)).toBeLessThanOrEqual(600)
  })
})
