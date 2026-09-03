const { pool } = require('../config/db')
const { ok, fail } = require('../utils/response')
const asyncHandler = require('../utils/asyncHandler')

// Los pedidos cancelados NO cuentan como venta. Antes el panel los sumaba en
// "Ventas totales", lo que inflaba la cifra más visible del sistema.
const ESTADO_ANULADO = 'Cancelado'
const UMBRAL_STOCK_BAJO = 5
const TOP_N = 8
const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/

// Todas las consultas acotan por rango con el mismo par de parámetros:
// >= desde 00:00 y < (hasta + 1 día), para incluir el día final completo
// aunque fecha_pedido sea DATETIME.
const RANGO = 'p.fecha_pedido >= ? AND p.fecha_pedido < DATE_ADD(?, INTERVAL 1 DAY)'

const num = (v) => Number(v || 0)

/** Diferencia en días entre dos 'YYYY-MM-DD', inclusiva. */
function diasEntre(desde, hasta) {
  const ms = new Date(`${hasta}T00:00:00Z`) - new Date(`${desde}T00:00:00Z`)
  return Math.round(ms / 86400000) + 1
}

function sumarDias(fecha, dias) {
  const d = new Date(`${fecha}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

/**
 * Resuelve el rango pedido y el rango inmediatamente anterior de la misma
 * duración, que es contra el que se compara cada KPI.
 * Sin fechas se toma todo el histórico y no hay comparativa posible.
 */
async function resolverRango(query) {
  const { desde, hasta } = query

  if (desde && !RE_FECHA.test(desde)) return { error: 'desde debe tener formato YYYY-MM-DD.' }
  if (hasta && !RE_FECHA.test(hasta)) return { error: 'hasta debe tener formato YYYY-MM-DD.' }

  if (!desde || !hasta) {
    const [[fila]] = await pool.query(
      "SELECT DATE_FORMAT(MIN(fecha_pedido), '%Y-%m-%d') AS min FROM pedidos"
    )
    const hoy = new Date().toISOString().slice(0, 10)
    return { desde: fila.min || hoy, hasta: hoy, completo: true, anterior: null }
  }

  if (desde > hasta) return { error: 'La fecha inicial no puede ser posterior a la final.' }

  const dias = diasEntre(desde, hasta)
  return {
    desde,
    hasta,
    dias,
    completo: false,
    anterior: { desde: sumarDias(desde, -dias), hasta: sumarDias(desde, -1) },
  }
}

/**
 * Rellena con ceros los días del rango que no tuvieron pedidos.
 *
 * SQL solo devuelve las fechas que existen en la tabla, así que un rango de 7
 * días con ventas en 3 dibujaba una línea de 3 puntos y el eje mostraba solo
 * esas fechas: parecía que faltaban datos. Con el relleno, un día sin ventas se
 * ve como lo que es, un cero.
 *
 * En rangos muy largos (más de un año, típicamente "Todo") no se rellena: son
 * cientos de puntos que no aportan nada a la lectura del gráfico.
 */
const MAX_DIAS_RELLENO = 370

function rellenarDias(filas, desde, hasta) {
  const span = diasEntre(desde, hasta)
  const normal = filas.map((f) => ({ fecha: f.fecha, ventas: num(f.ventas), pedidos: num(f.pedidos) }))
  if (span > MAX_DIAS_RELLENO) return normal

  const porFecha = new Map(normal.map((f) => [f.fecha, f]))
  const serie = []
  for (let i = 0, dia = desde; i < span; i += 1, dia = sumarDias(dia, 1)) {
    serie.push(porFecha.get(dia) || { fecha: dia, ventas: 0, pedidos: 0 })
  }
  return serie
}

/** KPIs de un rango: ventas netas, pedidos, unidades, ticket y cancelaciones. */
async function kpisDeRango(desde, hasta) {
  const p = [desde, hasta]

  const [[pedidos]] = await pool.query(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN p.estado <> ? THEN 1 ELSE 0 END) AS validos,
            SUM(CASE WHEN p.estado  = ? THEN 1 ELSE 0 END) AS cancelados,
            COALESCE(SUM(CASE WHEN p.estado <> ? THEN p.total ELSE 0 END), 0) AS ventas
       FROM pedidos p
      WHERE ${RANGO}`,
    [ESTADO_ANULADO, ESTADO_ANULADO, ESTADO_ANULADO, ...p]
  )

  const [[unidades]] = await pool.query(
    `SELECT COALESCE(SUM(dp.cantidad), 0) AS total
       FROM detallepedido dp
       JOIN pedidos p ON p.idPed = dp.idPed
      WHERE p.estado <> ? AND ${RANGO}`,
    [ESTADO_ANULADO, ...p]
  )

  const ventas = num(pedidos.ventas)
  const validos = num(pedidos.validos)
  const total = num(pedidos.total)

  return {
    ventas,
    pedidos: total,
    pedidosValidos: validos,
    cancelados: num(pedidos.cancelados),
    unidades: num(unidades.total),
    ticket: validos > 0 ? Math.round(ventas / validos) : 0,
    tasaCancelacion: total > 0 ? Math.round((num(pedidos.cancelados) / total) * 100) : 0,
  }
}

/**
 * Variación porcentual contra el período anterior.
 * Si antes era 0 no se devuelve un "+100%" engañoso: se devuelve null y el
 * panel muestra "—". Pasar de 0 a 1 venta no es un crecimiento medible.
 */
function variacion(actual, previo) {
  if (!previo) return null
  const calc = (a, b) => (b > 0 ? Math.round(((a - b) / b) * 100) : null)
  return {
    ventas: calc(actual.ventas, previo.ventas),
    pedidos: calc(actual.pedidos, previo.pedidos),
    ticket: calc(actual.ticket, previo.ticket),
    unidades: calc(actual.unidades, previo.unidades),
  }
}

// ── GET /api/reportes/resumen (admin) ───────────────────────────────────────
// Tarjetas del dashboard. Se mantiene como estaba: es un conteo global sin
// rango, distinto del informe de ventas.
const resumen = asyncHandler(async (req, res) => {
  const [[productos]] = await pool.query(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN COALESCE(inv.cantidad_disp, 0) = 0 THEN 1 ELSE 0 END) AS agotados
     FROM productos p LEFT JOIN inventario inv ON inv.idPro = p.idPro WHERE p.activo = TRUE`
  )
  const [[usuarios]] = await pool.query('SELECT COUNT(*) AS total FROM usuarios')
  const [[pedidos]] = await pool.query(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN estado = 'Pendiente'  THEN 1 ELSE 0 END) AS pendientes,
            SUM(CASE WHEN estado = 'En Camino'  THEN 1 ELSE 0 END) AS enCamino,
            SUM(CASE WHEN estado = 'Entregado'  THEN 1 ELSE 0 END) AS entregados,
            SUM(CASE WHEN estado = 'Cancelado'  THEN 1 ELSE 0 END) AS cancelados,
            COALESCE(SUM(CASE WHEN estado <> 'Cancelado' THEN total ELSE 0 END), 0) AS ventasTotales
     FROM pedidos`
  )
  const [[soporte]] = await pool.query(
    "SELECT SUM(CASE WHEN estado != 'Cerrado' THEN 1 ELSE 0 END) AS abiertos FROM soporte"
  )

  // 30 segundos de caché en cliente/proxy para evitar que F5 en el dashboard
  // dispare 4 queries simultáneas en cada recarga del admin.
  res.set('Cache-Control', 'private, max-age=30')

  return ok(res, {
    totalProductos: num(productos.total),
    productosAgotados: num(productos.agotados),
    totalUsuarios: num(usuarios.total),
    totalPedidos: num(pedidos.total),
    pedidosPendientes: num(pedidos.pendientes),
    pedidosEnCamino: num(pedidos.enCamino),
    pedidosEntregados: num(pedidos.entregados),
    pedidosCancelados: num(pedidos.cancelados),
    ventasTotales: num(pedidos.ventasTotales),
    pqrAbiertos: num(soporte.abiertos),
  })
})

// ── GET /api/reportes/ventas?desde=&hasta= (admin) ──────────────────────────
// Todo el informe en una sola llamada, calculado en SQL.
//
// Antes el panel se armaba en el navegador con TODOS los pedidos del sistema
// (cada uno con detalle, pago, factura y envío: 5 consultas por pedido). Con
// 500 pedidos eran ~2.500 consultas por cada visita al panel, para dibujar
// tres gráficos. Ahora son 7 consultas agregadas, sin importar el volumen.
const ventas = asyncHandler(async (req, res) => {
  const rango = await resolverRango(req.query)
  if (rango.error) return fail(res, rango.error)

  const p = [rango.desde, rango.hasta]

  const [kpis, previo] = await Promise.all([
    kpisDeRango(rango.desde, rango.hasta),
    rango.anterior ? kpisDeRango(rango.anterior.desde, rango.anterior.hasta) : null,
  ])

  const [porDia] = await pool.query(
    `SELECT DATE_FORMAT(p.fecha_pedido, '%Y-%m-%d') AS fecha,
            COALESCE(SUM(CASE WHEN p.estado <> ? THEN p.total ELSE 0 END), 0) AS ventas,
            COUNT(*) AS pedidos
       FROM pedidos p
      WHERE ${RANGO}
      GROUP BY fecha
      ORDER BY fecha`,
    [ESTADO_ANULADO, ...p]
  )

  const [porEstado] = await pool.query(
    `SELECT p.estado, COUNT(*) AS cantidad, COALESCE(SUM(p.total), 0) AS monto
       FROM pedidos p
      WHERE ${RANGO}
      GROUP BY p.estado`,
    p
  )

  const [topProductos] = await pool.query(
    `SELECT pr.idPro, pr.nombre,
            SUM(dp.cantidad) AS unidades,
            SUM(dp.cantidad * dp.precio_unitario) AS monto
       FROM detallepedido dp
       JOIN pedidos   p  ON p.idPed  = dp.idPed
       JOIN productos pr ON pr.idPro = dp.idPro
      WHERE p.estado <> ? AND ${RANGO}
      GROUP BY pr.idPro, pr.nombre
      ORDER BY monto DESC
      LIMIT ${TOP_N}`,
    [ESTADO_ANULADO, ...p]
  )

  const [porCategoria] = await pool.query(
    `SELECT COALESCE(c.nombre, 'Sin categoría') AS categoria,
            SUM(dp.cantidad) AS unidades,
            SUM(dp.cantidad * dp.precio_unitario) AS monto
       FROM detallepedido dp
       JOIN pedidos    p  ON p.idPed  = dp.idPed
       JOIN productos  pr ON pr.idPro = dp.idPro
       LEFT JOIN categorias c ON c.idCat = pr.idCat
      WHERE p.estado <> ? AND ${RANGO}
      GROUP BY c.idCat, c.nombre
      ORDER BY monto DESC`,
    [ESTADO_ANULADO, ...p]
  )

  // El inventario es una foto del momento, no depende del rango de fechas.
  const [inventarioCritico] = await pool.query(
    `SELECT pr.idPro, pr.nombre, COALESCE(inv.cantidad_disp, 0) AS stock
       FROM productos pr
       LEFT JOIN inventario inv ON inv.idPro = pr.idPro
      WHERE pr.activo = TRUE AND COALESCE(inv.cantidad_disp, 0) <= ?
      ORDER BY stock ASC, pr.nombre ASC
      LIMIT 20`,
    [UMBRAL_STOCK_BAJO]
  )

  return ok(res, {
    rango: { desde: rango.desde, hasta: rango.hasta, dias: rango.dias || null, completo: rango.completo },
    comparativa: rango.anterior,
    kpis,
    previo,
    variacion: variacion(kpis, previo),
    porDia: rellenarDias(porDia, rango.desde, rango.hasta),
    porEstado: porEstado.map((e) => ({ estado: e.estado, cantidad: num(e.cantidad), monto: num(e.monto) })),
    topProductos: topProductos.map((t) => ({ ...t, unidades: num(t.unidades), monto: num(t.monto) })),
    porCategoria: porCategoria.map((c) => ({ ...c, unidades: num(c.unidades), monto: num(c.monto) })),
    inventarioCritico: inventarioCritico.map((i) => ({ ...i, stock: num(i.stock) })),
    umbralStockBajo: UMBRAL_STOCK_BAJO,
    generadoEn: new Date().toISOString(),
  })
})

// ── GET /api/reportes/ventas.csv?desde=&hasta= (admin) ──────────────────────
// Se genera en el servidor sobre los datos completos del rango.
//
// Formato pensado para Excel en español:
//   · BOM UTF-8 al inicio, si no "Bogotá" se abre como "BogotÃ¡".
//   · Separador ';' — con ',' Excel en configuración regional española mete
//     todo en una sola columna.
//   · Decimales con coma.
// El escape de comillas es el del RFC: se duplican. El CSV anterior las
// dejaba pasar tal cual y un cliente con comillas en el nombre partía la fila.
const ventasCsv = asyncHandler(async (req, res) => {
  const rango = await resolverRango(req.query)
  if (rango.error) return fail(res, rango.error)

  const p = [rango.desde, rango.hasta]

  const [filas] = await pool.query(
    `SELECT p.idPed,
            DATE_FORMAT(p.fecha_pedido, '%Y-%m-%d') AS fecha,
            CONCAT(u.nombre, ' ', u.apellido) AS cliente,
            c.correo,
            p.estado,
            p.total,
            COALESCE((SELECT SUM(dp.cantidad) FROM detallepedido dp WHERE dp.idPed = p.idPed), 0) AS unidades
       FROM pedidos p
       JOIN usuarios u ON u.idUsu = p.idUsu
       LEFT JOIN credencial c ON c.idUsu = p.idUsu
      WHERE ${RANGO}
      ORDER BY p.fecha_pedido ASC, p.idPed ASC`,
    p
  )

  const kpis = await kpisDeRango(rango.desde, rango.hasta)

  const celda = (v) => {
    if (v === null || v === undefined) return ''
    const s = String(v)
    return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const money = (n) => Number(n).toFixed(2).replace('.', ',')
  const fila = (cols) => cols.map(celda).join(';')

  const lineas = [
    fila(['Reporte de ventas ComVibes']),
    fila(['Rango', `${rango.desde} a ${rango.hasta}`]),
    fila(['Generado', new Date().toLocaleString('es-CO')]),
    fila(['Ventas netas (sin cancelados)', money(kpis.ventas)]),
    fila(['Pedidos', kpis.pedidos]),
    fila(['Pedidos cancelados', kpis.cancelados]),
    fila(['Unidades vendidas', kpis.unidades]),
    fila(['Ticket promedio', money(kpis.ticket)]),
    '',
    fila(['ID Pedido', 'Fecha', 'Cliente', 'Correo', 'Estado', 'Unidades', 'Total']),
    ...filas.map((f) =>
      fila([f.idPed, f.fecha, f.cliente, f.correo, f.estado, f.unidades, money(f.total)])
    ),
  ]

  const csv = `﻿${lineas.join('\r\n')}\r\n`
  const nombre = `reporte-ventas-comvibes-${rango.desde}_a_${rango.hasta}.csv`

  res.set('Content-Type', 'text/csv; charset=utf-8')
  res.set('Content-Disposition', `attachment; filename="${nombre}"`)
  return res.send(csv)
})

module.exports = { resumen, ventas, ventasCsv }
