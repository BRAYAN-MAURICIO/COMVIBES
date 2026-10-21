// Registro con verificación de correo y checkout completo, contra la base de
// PRUEBAS (npm run test:db). Son los casos R-01..R-07 y P-01..P-07 que antes
// vivían como script suelto en docs/calidad/evidencias/scripts/e2e.js y
// había que correr a mano; ahora corren con el resto de las pruebas y en CI.
const request = require('supertest')
const app = require('../src/app')
const { pool } = require('../src/config/db')
const mailer = require('../src/utils/mailer')
const h = require('./helpers')

const { describeDB } = h
const conToken = (u) => ({ Authorization: `Bearer ${u.token}` })
const contar = async (sql, params = []) => Number((await pool.query(sql, params))[0][0].n)

describeDB('Registro y verificación de correo', () => {
  afterEach(() => jest.restoreAllMocks())

  it('R-01 · rechaza el registro sin campos obligatorios', async () => {
    const res = await request(app).post('/api/auth/register').send({ correo: 'faltan@test.com' })
    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/obligatorio/)
  })

  it('R-02 · rechaza una contraseña de menos de 8 caracteres', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ nombre: 'Ana', apellido: 'Ruiz', correo: `corta.${Date.now()}@test.com`, password: '1234567' })
    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/8 caracteres/)
  })

  it('R-03 a R-06 · registro completo: cuenta sin verificar, código solo como hash, verificación y duplicados', async () => {
    let codigo
    jest.spyOn(mailer, 'enviarCodigoVerificacion').mockImplementation(async (_correo, _nombre, c) => { codigo = c })
    const correo = `nuevo.${Date.now()}@test.com`

    // R-03: crea usuario + credencial + rol + carrito + código, en una transacción
    const reg = await request(app).post('/api/auth/register')
      .send({ nombre: 'Ana', apellido: 'Ruiz', correo, password: 'Segura12345' })
    expect(reg.status).toBe(201)
    expect(reg.body.data.requiereVerificacion).toBe(true)
    expect(reg.body.data.token).toBeUndefined()

    const [[cred]] = await pool.query('SELECT idUsu, correo_verificado FROM credencial WHERE correo = ?', [correo])
    expect(cred.correo_verificado).toBe(0)
    const [[rol]] = await pool.query(
      'SELECT r.nombre FROM usuariorol ur JOIN roles r ON r.idRol = ur.idRol WHERE ur.idUsu = ?', [cred.idUsu])
    expect(rol.nombre).toBe('cliente')
    expect(await contar('SELECT COUNT(*) AS n FROM carrito WHERE idUsu = ?', [cred.idUsu])).toBe(1)
    const [[ver]] = await pool.query('SELECT codigo_hash FROM email_verifications WHERE idUsu = ?', [cred.idUsu])
    expect(ver.codigo_hash).toMatch(/^\$2[aby]\$/)
    expect(ver.codigo_hash).not.toContain(codigo)

    // R-04: registrarse otra vez sin haber verificado guía a la verificación
    const repetido = await request(app).post('/api/auth/register')
      .send({ nombre: 'Ana', apellido: 'Ruiz', correo, password: 'Segura12345' })
    expect(repetido.status).toBe(409)
    expect(repetido.body.details).toEqual({ requiereVerificacion: true })

    // R-05: el código del correo activa la cuenta y deja la sesión abierta
    const verif = await request(app).post('/api/auth/verify-email').send({ correo, codigo })
    expect(verif.status).toBe(200)
    expect(verif.body.data.token).toBeTruthy()

    // R-06: con la cuenta ya verificada, el duplicado es un 409 sin details
    const yaVerificada = await request(app).post('/api/auth/register')
      .send({ nombre: 'Ana', apellido: 'Ruiz', correo, password: 'Segura12345' })
    expect(yaVerificada.status).toBe(409)
    expect(yaVerificada.body.details).toBeUndefined()
  })

  it('R-07 · si el correo no sale, rollback total: no queda una cuenta imposible de activar', async () => {
    const fallo = Object.assign(new Error('SMTP caído'), { esErrorDeCorreo: true })
    jest.spyOn(mailer, 'enviarCodigoVerificacion').mockRejectedValue(fallo)
    jest.spyOn(console, 'error').mockImplementation(() => {})
    const correo = `sinsmtp.${Date.now()}@test.com`
    const antes = await contar('SELECT COUNT(*) AS n FROM usuarios')

    const res = await request(app).post('/api/auth/register')
      .send({ nombre: 'Ana', apellido: 'Ruiz', correo, password: 'Segura12345' })

    expect(res.status).toBe(502)
    expect(await contar('SELECT COUNT(*) AS n FROM usuarios')).toBe(antes)
    expect(await contar('SELECT COUNT(*) AS n FROM credencial WHERE correo = ?', [correo])).toBe(0)
  })
})

describeDB('Checkout', () => {
  let a, b, dirA, dirB, idMet, prod1, prod2

  beforeAll(async () => {
    const s = Date.now()
    a = await h.crearUsuario(`checkout.a.${s}@test.com`, 'cliente')
    b = await h.crearUsuario(`checkout.b.${s}@test.com`, 'cliente')
    dirA = (await request(app).post('/api/direcciones').set(conToken(a)).send({ direccion: 'Cra 4 # 5-20', ciudad: 'La Plata' })).body.data.idDir
    dirB = (await request(app).post('/api/direcciones').set(conToken(b)).send({ direccion: 'Cl 8 # 2-10', ciudad: 'Neiva' })).body.data.idDir
    idMet = await h.metodoActivo()
    const [prods] = await pool.query('SELECT idPro FROM productos WHERE activo = TRUE ORDER BY idPro LIMIT 2 OFFSET 2')
    ;[prod1, prod2] = prods.map((p) => p.idPro)
    await pool.query('UPDATE productos SET precio = 100000 WHERE idPro = ?', [prod1])
    await pool.query('UPDATE productos SET precio = 85000 WHERE idPro = ?', [prod2])
    await pool.query('UPDATE inventario SET cantidad_disp = 20 WHERE idPro IN (?, ?)', [prod1, prod2])
  })

  beforeEach(async () => {
    await request(app).delete('/api/carrito').set(conToken(a))
    await request(app).delete('/api/carrito').set(conToken(b))
  })

  afterAll(async () => {
    await pool.end()
  })

  const agregar = (u, idPro, cantidad) => request(app).post('/api/carrito/items').set(conToken(u)).send({ idPro, cantidad })
  const pagar = (u, body) => request(app).post('/api/pedidos').set(conToken(u)).send(body)

  it('P-01 · exige método de pago', async () => {
    const res = await pagar(a, { idDir: dirA })
    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/idMet es obligatorio/)
  })

  it('P-02 · rechaza un carrito vacío', async () => {
    const res = await pagar(a, { idDir: dirA, idMet })
    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/vacío/)
  })

  it('P-03 · rechaza la dirección de otro cliente', async () => {
    await agregar(a, prod1, 1)
    const res = await pagar(a, { idDir: dirB, idMet })
    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/Dirección no válida/)
  })

  it('P-04 · compra completa: pedido, detalle, stock, pago, factura, envío, carrito vacío y notificación', async () => {
    await agregar(a, prod1, 2)
    await agregar(a, prod2, 1)
    const s1 = await h.stockDe(prod1)
    const s2 = await h.stockDe(prod2)

    const res = await pagar(a, { idDir: dirA, idMet, totalEsperado: 285000 })
    const ped = res.body.data

    expect(res.status).toBe(201)
    expect(Number(ped.total)).toBe(285000)
    expect(ped.detalle).toHaveLength(2)
    expect(await h.stockDe(prod1)).toBe(s1 - 2)
    expect(await h.stockDe(prod2)).toBe(s2 - 1)
    expect(ped.factura.numero_factura).toMatch(/^FAC-\d{6}$/)
    expect(ped.pago.estado).toBe('Completado')
    expect(ped.envio.estado_envio).toBe('Pendiente')
    const carrito = await request(app).get('/api/carrito').set(conToken(a))
    expect(carrito.body.data.items).toHaveLength(0)
    const [[notif]] = await pool.query('SELECT mensaje FROM notificaciones WHERE idUsu = ? ORDER BY idNot DESC LIMIT 1', [a.idUsu])
    expect(notif.mensaje).toMatch(/fue creado/)
  })

  it('P-05 · stock insuficiente al pagar: 400 y ningún pedido nuevo', async () => {
    await agregar(a, prod2, 2)
    await pool.query('UPDATE inventario SET cantidad_disp = 1 WHERE idPro = ?', [prod2])
    const antes = await contar('SELECT COUNT(*) AS n FROM pedidos')

    const res = await pagar(a, { idDir: dirA, idMet })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/suficiente stock/)
    expect(await contar('SELECT COUNT(*) AS n FROM pedidos')).toBe(antes)
  })

  it('P-06 · dos clientes pagan la última unidad a la vez: uno gana, el stock nunca queda negativo', async () => {
    await pool.query('UPDATE inventario SET cantidad_disp = 5 WHERE idPro = ?', [prod2])
    await agregar(a, prod2, 1)
    await agregar(b, prod2, 1)
    await pool.query('UPDATE inventario SET cantidad_disp = 1 WHERE idPro = ?', [prod2])
    const antes = await contar('SELECT COUNT(*) AS n FROM pedidos')

    const [ra, rb] = await Promise.all([
      pagar(a, { idDir: dirA, idMet }),
      pagar(b, { idDir: dirB, idMet }),
    ])

    expect([ra.status, rb.status].sort()).toEqual([201, 400])
    expect(await h.stockDe(prod2)).toBe(0)
    expect(await contar('SELECT COUNT(*) AS n FROM pedidos')).toBe(antes + 1)
  })

  it('P-07 · historial paginado del cliente', async () => {
    const res = await request(app).get('/api/pedidos').query({ page: 1, limit: 1 }).set(conToken(a))
    expect(res.status).toBe(200)
    expect(res.body.data.pedidos).toHaveLength(1)
    expect(res.body.data.total).toBeGreaterThanOrEqual(1)
    expect(res.body.data.totalPages).toBe(res.body.data.total)
  })
})
