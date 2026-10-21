// Esquemas de validación del API (zod). Auditoría ISO 2026-09-26, hallazgo H5.
//
// Los límites de longitud son los de las columnas en sql/Comvibes_db_final.sql:
// si una columna cambia de tamaño, hay que cambiarlo también aquí.
//
// Convenciones:
// - Los textos se recortan. En campos OPCIONALES, '' se convierte en null
//   (los controladores usan COALESCE(?, columna), así que null = "no cambiar").
// - Los números aceptan número o texto numérico ("12"), porque los formularios
//   a veces mandan el valor del input tal cual; siempre salen como número.
// - Las contraseñas NO se recortan: un espacio al final es parte de la clave.
const { z } = require('zod')

const limpiar = (v) => (typeof v === 'string' ? v.trim() : v)
const vacioANull = (v) => {
  const x = limpiar(v)
  return x === '' ? null : x
}

const textoReq = (max, campo) =>
  z.preprocess(limpiar, z.string().min(1, `${campo} es obligatorio.`).max(max, `${campo} admite máximo ${max} caracteres.`))

const textoOpc = (max, campo) =>
  z.preprocess(vacioANull, z.string().max(max, `${campo} admite máximo ${max} caracteres.`).nullable().optional())

const correoReq = (campo = 'correo') =>
  z.preprocess(limpiar, z.email(`${campo} debe ser un correo válido.`).max(100, `${campo} admite máximo 100 caracteres.`))

const correoOpc = (max, campo = 'correo') =>
  z.preprocess(
    vacioANull,
    z.email(`${campo} debe ser un correo válido.`).max(max, `${campo} admite máximo ${max} caracteres.`).nullable().optional()
  )

const entero = (campo, min, max) =>
  z.coerce
    .number()
    .int(`${campo} debe ser un número entero.`)
    .min(min, `${campo} debe ser mayor o igual a ${min}.`)
    .max(max, `${campo} debe ser menor o igual a ${max}.`)

const id = (campo) => z.coerce.number().int(`${campo} debe ser un número entero.`).positive(`${campo} no es válido.`)

const idOpc = (campo) =>
  z.preprocess(
    (v) => (v === '' || v === null ? null : v === undefined ? undefined : Number(v)),
    z.number(`${campo} no es válido.`).int(`${campo} no es válido.`).positive(`${campo} no es válido.`).nullable().optional()
  )

const booleano = (campo) =>
  z.preprocess((v) => {
    if (v === 'true' || v === 1 || v === '1') return true
    if (v === 'false' || v === 0 || v === '0') return false
    return v
  }, z.boolean(`${campo} debe ser verdadero o falso.`))

const fechaOpc = (campo) =>
  z.preprocess(
    vacioANull,
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `${campo} debe tener formato AAAA-MM-DD.`).nullable().optional()
  )

// bcrypt solo usa los primeros 72 bytes: una clave más larga daría una falsa
// sensación de seguridad.
const passwordNueva = (campo) =>
  z.string(`${campo} es obligatorio.`).min(8, `${campo} debe tener mínimo 8 caracteres.`).max(72, `${campo} admite máximo 72 caracteres.`)
const passwordActual = (campo) =>
  z.string(`${campo} es obligatorio.`).min(1, `${campo} es obligatorio.`).max(200, `${campo} admite máximo 200 caracteres.`)

const codigo6 = z.preprocess(
  (v) => (typeof v === 'number' ? String(v) : limpiar(v)),
  z.string('codigo es obligatorio.').regex(/^\d{6}$/, 'El código debe tener 6 dígitos.')
)

// ── Valores cerrados (mismos ENUM de la BD) ─────────────────────────────────
const ESTADOS_CUENTA = ['activo', 'inactivo', 'bloqueado']
const ROLES = ['admin', 'cliente']
const GENEROS = ['Masculino', 'Femenino', 'Otro', 'Prefiero no decir']
const ESTADOS_PEDIDO = ['Pendiente', 'En Camino', 'Entregado', 'Cancelado']
const ESTADOS_ENVIO = ['Pendiente', 'Enviado', 'En tránsito', 'Entregado', 'Devuelto']
const ESTADOS_TICKET = ['Abierto', 'En Progreso', 'Cerrado']

const unoDe = (valores, campo) =>
  z.enum(valores, `${campo} debe ser uno de: ${valores.join(', ')}.`)

// ── Autenticación ──────────────────────────────────────────────────────────
const auth = {
  registro: z.object({
    nombre: textoReq(100, 'nombre'),
    apellido: textoReq(100, 'apellido'),
    correo: correoReq(),
    password: passwordNueva('password'),
    documento_id: textoOpc(20, 'documento_id'),
  }),
  login: z.object({
    correo: textoReq(100, 'correo'),
    password: passwordActual('password'),
  }),
  soloCorreo: z.object({ correo: correoReq() }),
  verificar: z.object({ correo: correoReq(), codigo: codigo6 }),
  reset: z.object({ correo: correoReq(), codigo: codigo6, passwordNueva: passwordNueva('passwordNueva') }),
}

// ── Usuarios ───────────────────────────────────────────────────────────────
const datosPersonales = z.object({
  nombre: textoOpc(100, 'nombre'),
  apellido: textoOpc(100, 'apellido'),
  documento_id: textoOpc(20, 'documento_id'),
  fecha_nacimiento: fechaOpc('fecha_nacimiento'),
  genero: z.preprocess(vacioANull, unoDe(GENEROS, 'genero').nullable().optional()),
})

const usuarios = {
  perfil: datosPersonales,
  password: z.object({
    passwordActual: passwordActual('passwordActual'),
    passwordNueva: passwordNueva('passwordNueva'),
  }),
  rol: z.object({ rol: unoDe(ROLES, 'rol') }),
  estado: z.object({ estado: unoDe(ESTADOS_CUENTA, 'estado') }),
}

// ── Carrito y lista de deseos ──────────────────────────────────────────────
const carrito = {
  agregar: z.object({ idPro: id('idPro'), cantidad: entero('cantidad', 1, 999).default(1) }),
  actualizar: z.object({ cantidad: entero('cantidad', 0, 999) }),
  sincronizar: z.object({
    items: z
      .array(z.object({ idPro: id('idPro'), cantidad: entero('cantidad', 1, 999) }), 'items debe ser una lista.')
      .max(100, 'El carrito admite máximo 100 productos distintos.'),
  }),
}
const wishlist = { toggle: z.object({ idPro: id('idPro') }) }

// ── Direcciones ────────────────────────────────────────────────────────────
const camposDireccion = {
  etiqueta: textoOpc(50, 'etiqueta'),
  departamento: textoOpc(100, 'departamento'),
  pais: textoOpc(100, 'pais'),
  codigo_postal: textoOpc(20, 'codigo_postal'),
  telefono: textoOpc(20, 'telefono'),
  predeterminada: booleano('predeterminada').optional(),
}
const direcciones = {
  crear: z.object({ ...camposDireccion, direccion: textoReq(255, 'direccion'), ciudad: textoReq(100, 'ciudad') }),
  actualizar: z.object({ ...camposDireccion, direccion: textoOpc(255, 'direccion'), ciudad: textoOpc(100, 'ciudad') }),
}

// ── Pedidos y envíos ───────────────────────────────────────────────────────
const pedidos = {
  crear: z.object({
    idDir: id('idDir'),
    idMet: id('idMet'),
    // Total que el cliente vio en pantalla. Si el del servidor es distinto
    // (cambió un precio o el stock recortó el carrito), se frena la compra (H6).
    totalEsperado: z.coerce.number().min(0, 'totalEsperado no es válido.').optional(),
  }),
  estado: z.object({ estado: unoDe(ESTADOS_PEDIDO, 'estado') }),
}
const envios = {
  upsert: z.object({
    transportadora: textoOpc(100, 'transportadora'),
    numero_guia: textoOpc(50, 'numero_guia'),
    fecha_estimada: fechaOpc('fecha_estimada'),
    estado_envio: z.preprocess(vacioANull, unoDe(ESTADOS_ENVIO, 'estado_envio').nullable().optional()),
    telefono_contacto: textoOpc(20, 'telefono_contacto'),
    idDir: idOpc('idDir'),
  }),
}

// ── Catálogo ───────────────────────────────────────────────────────────────
const camposProducto = {
  nombre: textoReq(150, 'nombre'),
  marca: textoOpc(100, 'marca'),
  descripcion: textoOpc(5000, 'descripcion'),
  precio: z.coerce
    .number('precio debe ser un número.')
    .positive('precio debe ser mayor que 0.')
    .max(99999999.99, 'precio es demasiado alto.'),
  color: textoOpc(50, 'color'),
  talla: textoOpc(50, 'talla'),
  idCat: idOpc('idCat'),
  idProv: idOpc('idProv'),
  imagen_url: textoOpc(255, 'imagen_url'),
  activo: booleano('activo').optional(),
  stock: entero('stock', 0, 1000000).optional(),
  imagenes: z
    .array(z.preprocess(limpiar, z.string().min(1).max(255, 'Cada URL de imagen admite máximo 255 caracteres.')), 'imagenes debe ser una lista.')
    .max(5, 'Un producto admite máximo 5 imágenes.')
    .optional(),
}
const productos = {
  crear: z.object(camposProducto),
  actualizar: z.object(camposProducto).partial(),
  stock: z.object({
    cantidad_disp: entero('cantidad_disp', 0, 1000000).optional(),
    ajuste: entero('ajuste', -1000000, 1000000).optional(),
    ubicacion: textoOpc(100, 'ubicacion'),
  }),
  imagen: z.object({ url: textoReq(255, 'url'), orden: entero('orden', 0, 100).optional() }),
}

const camposCategoria = { nombre: textoReq(100, 'nombre'), descripcion: textoOpc(200, 'descripcion') }
const categorias = {
  crear: z.object(camposCategoria),
  actualizar: z.object(camposCategoria).partial(),
}

const camposProveedor = {
  nombre: textoReq(150, 'nombre'),
  categoria: textoOpc(100, 'categoria'),
  contacto: textoOpc(100, 'contacto'),
  telefono: textoOpc(20, 'telefono'),
  correo: correoOpc(100),
  direccion: textoOpc(255, 'direccion'),
  ciudad: textoOpc(100, 'ciudad'),
  pais: textoOpc(100, 'pais'),
}
const proveedores = {
  crear: z.object(camposProveedor),
  actualizar: z.object(camposProveedor).partial(),
}

const camposMetodo = {
  nombre: textoReq(50, 'nombre'),
  descripcion: textoOpc(150, 'descripcion'),
  activo: booleano('activo').optional(),
}
const metodosPago = {
  crear: z.object(camposMetodo),
  actualizar: z.object(camposMetodo).partial(),
}

// ── Opiniones y soporte ────────────────────────────────────────────────────
const opiniones = {
  crear: z.object({
    idPro: id('idPro'),
    calificacion: entero('calificacion', 1, 5),
    comentario: textoOpc(2000, 'comentario'),
  }),
}

const soporte = {
  crear: z.object({
    asunto: textoReq(150, 'asunto'),
    descripcion: textoReq(5000, 'descripcion'),
    nombre: textoOpc(150, 'nombre'),
    correo: correoOpc(150),
  }),
  responder: z.object({
    respuesta_admin: textoReq(5000, 'respuesta_admin'),
    estado: unoDe(ESTADOS_TICKET, 'estado').optional(),
  }),
  estado: z.object({ estado: unoDe(ESTADOS_TICKET, 'estado') }),
}

module.exports = {
  auth, usuarios, carrito, wishlist, direcciones, pedidos, envios,
  productos, categorias, proveedores, metodosPago, opiniones, soporte,
}
