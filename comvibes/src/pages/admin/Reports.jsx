import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts'
import {
  Download, Printer, TrendingUp, TrendingDown, Minus, ShoppingBag, Receipt,
  Boxes, CalendarRange, Trophy, AlertTriangle, Layers,
} from 'lucide-react'
import { useToast } from '../../context/ToastContext'
import { formatCurrency } from '../../utils/formatters'
import * as reportesApi from '../../api/reportes'

// ── Fechas ──────────────────────────────────────────────────────────────────
// El backend devuelve 'YYYY-MM-DD'. Se formatean partiendo la cadena en vez de
// pasarla por new Date(): 'new Date("2026-08-15")' se interpreta como UTC y en
// Colombia (UTC-5) termina mostrando el 14.
const hoyISO = () => new Date().toLocaleDateString('en-CA')
const diaMes = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '')
const fechaLarga = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '')

function desplazar(dias) {
  const d = new Date()
  d.setDate(d.getDate() + dias)
  return d.toLocaleDateString('en-CA')
}

function primerDiaDeMes(offsetMeses = 0) {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() + offsetMeses)
  return d.toLocaleDateString('en-CA')
}

function ultimoDiaDeMes(offsetMeses = 0) {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() + offsetMeses + 1)
  d.setDate(0)
  return d.toLocaleDateString('en-CA')
}

const PRESETS = [
  { id: '7d',        label: 'Últimos 7 días',  rango: () => ({ desde: desplazar(-6),  hasta: hoyISO() }) },
  { id: '30d',       label: 'Últimos 30 días', rango: () => ({ desde: desplazar(-29), hasta: hoyISO() }) },
  { id: 'mes',       label: 'Este mes',        rango: () => ({ desde: primerDiaDeMes(),   hasta: hoyISO() }) },
  { id: 'mesPasado', label: 'Mes pasado',      rango: () => ({ desde: primerDiaDeMes(-1), hasta: ultimoDiaDeMes(-1) }) },
  { id: 'todo',      label: 'Todo',            rango: () => ({ desde: '', hasta: '' }) },
]

// Colores de estado: son semánticos (bueno / en curso / pendiente / anulado),
// no identidades de serie, así que se toman de la paleta de estado y no de la
// categórica. Van siempre acompañados del nombre y el conteo, nunca color solo:
// rojo y verde quedan cerca bajo daltonismo deutan.
const ESTADO_COLOR = {
  Pendiente: '#F59E0B',
  'En Camino': '#2563EB',
  Entregado: '#22C55E',
  Cancelado: '#EF4444',
}

/**
 * Lee los colores del tema desde las variables CSS, para que los gráficos
 * sigan el modo claro/oscuro en vez de quedarse con valores fijos.
 */
function useChartTheme() {
  const leer = () => {
    const cs = getComputedStyle(document.documentElement)
    const v = (n, fallback) => cs.getPropertyValue(n).trim() || fallback
    return {
      serie: v('--primary', '#1D4ED8'),
      grid: v('--border', '#E2E8F0'),
      texto: v('--text-muted', '#6B7280'),
      superficie: v('--white', '#FFFFFF'),
    }
  }

  const [tema, setTema] = useState(leer)

  useEffect(() => {
    const obs = new MutationObserver(() => setTema(leer()))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])

  return tema
}

/** Etiqueta compacta para el eje Y: 1.200.000 → $1,2M ; 45.000 → $45k */
function montoCorto(v) {
  const n = Number(v) || 0
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1).replace('.', ',')}M`
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1000)}k`
  return `$${n}`
}

/**
 * Traduce el error de red a algo accionable. El status importa: un 404 casi
 * siempre significa que el backend quedó corriendo con el código viejo, y sin
 * esa pista uno se pone a revisar el frontend para nada.
 */
function describirError(err) {
  const status = err?.status
  if (status === 404) {
    return {
      mensaje: 'El endpoint /api/reportes/ventas no existe en el servidor.',
      pista: 'Suele pasar cuando el backend sigue corriendo con el código anterior. Reinicia el servidor (npm run dev en comvibes-backend) y vuelve a intentar.',
    }
  }
  if (status === 401 || status === 403) {
    return { mensaje: 'Tu sesión no tiene permisos de administrador.', pista: 'Vuelve a iniciar sesión con la cuenta de admin.' }
  }
  if (status >= 500) {
    return { mensaje: err.message, pista: 'Error del servidor. Revisa la terminal del backend: el detalle sale ahí.' }
  }
  if (!status) {
    return { mensaje: 'No se pudo contactar al servidor.', pista: 'Comprueba que el backend esté corriendo en el puerto 4000.' }
  }
  return { mensaje: err.message, pista: null }
}

/**
 * Chip de variación contra el período anterior. null = no comparable.
 *
 * Devuelve SIEMPRE la misma forma de nodos: un icono con key + un span de
 * texto. La versión anterior tenía dos returns distintos —uno con dos hijos y
 * otro con cuatro, mezclando elementos y trozos de texto sueltos— y al cambiar
 * de rango React intentaba reordenar esos nodos en su sitio. De ahí salía el
 * "NotFoundError: Failed to execute 'insertBefore'" que apuntaba a
 * <TrendingUp> / <TrendingDown>: son justo los iconos que se intercambiaban.
 * La key hace que el icono se reemplace limpio en vez de mutarse en el sitio.
 */
function Delta({ valor }) {
  const comparable = valor !== null && valor !== undefined
  const sube = comparable && valor > 0
  const baja = comparable && valor < 0

  const clase = !comparable || valor === 0 ? 'neutro' : sube ? 'sube' : 'baja'
  const Icon = sube ? TrendingUp : baja ? TrendingDown : Minus
  const texto = comparable ? `${sube ? '+' : ''}${valor}%` : '—'

  return (
    <span
      className={`report-delta report-delta--${clase}`}
      title={comparable ? 'Variación respecto al período anterior' : 'Sin datos del período anterior para comparar'}
    >
      <Icon key={clase} size={12} />
      <span>{texto}</span>
    </span>
  )
}

function KpiCard({ icono: Icon, titulo, valor, delta, nota }) {
  return (
    <div className='card stat-card shadow-sm border-0 p-4 h-100 page-break-avoid'>
      <div className='d-flex justify-content-between align-items-start mb-2'>
        <h6 className='text-muted mb-0'>{titulo}</h6>
        <Icon size={22} className='text-primary flex-shrink-0' />
      </div>
      <div className='report-kpi-valor'>{valor}</div>
      {/* Los dos huecos se renderizan siempre, aunque estén vacíos: si
          aparecen y desaparecen según los datos, React tiene que insertar y
          quitar nodos hermanos en cada recarga del rango. */}
      <div className='d-flex align-items-center gap-2 mt-2'>
        <Delta valor={delta ?? null} />
        <small className='text-muted'>{nota || ''}</small>
      </div>
    </div>
  )
}

/** Barras horizontales en HTML: no colisionan etiquetas y se imprimen bien. */
function BarraLista({ items, max, colorVar = 'var(--primary)' }) {
  return (
    <div className='d-flex flex-column gap-3'>
      {items.map((item, i) => (
        <div key={item.clave}>
          <div className='d-flex justify-content-between align-items-center gap-2 mb-1'>
            <span className='d-flex align-items-center gap-2 min-w-0'>
              {item.rank && <span className='ranking-badge'>{i + 1}</span>}
              <span className='fw-semibold small text-truncate'>{item.etiqueta}</span>
            </span>
            <span className='fw-bold small text-nowrap' style={{ color: colorVar }}>
              {formatCurrency(item.monto)}
            </span>
          </div>
          <div className='progress' style={{ height: '6px' }}>
            <div
              className='progress-bar'
              style={{ width: `${max > 0 ? Math.round((item.monto / max) * 100) : 0}%`, background: colorVar }}
              role='progressbar'
              aria-valuenow={item.monto}
              aria-valuemin='0'
              aria-valuemax={max}
            />
          </div>
          {item.detalle && <small className='text-muted'>{item.detalle}</small>}
        </div>
      ))}
    </div>
  )
}

function Reports() {
  const toast = useToast()
  const tema = useChartTheme()

  const [presetId, setPresetId] = useState('30d')
  const [desde, setDesde] = useState(() => desplazar(-29))
  const [hasta, setHasta] = useState(hoyISO)

  const [data, setData] = useState(null)
  const [cargando, setCargando] = useState(true)   // primera carga: esqueleto
  const [refrescando, setRefrescando] = useState(false) // recarga: se atenúa lo anterior
  const [error, setError] = useState(null)
  const primeraCarga = useRef(true)

  const cargar = useCallback(async () => {
    if (primeraCarga.current) setCargando(true)
    else setRefrescando(true)
    setError(null)
    try {
      setData(await reportesApi.getVentas({ desde, hasta }))
    } catch (err) {
      setError(describirError(err))
    } finally {
      primeraCarga.current = false
      setCargando(false)
      setRefrescando(false)
    }
  }, [desde, hasta])

  useEffect(() => { cargar() }, [cargar])

  const aplicarPreset = (preset) => {
    const r = preset.rango()
    setPresetId(preset.id)
    setDesde(r.desde)
    setHasta(r.hasta)
  }

  const cambiarFecha = (campo, valor) => {
    setPresetId('')
    if (campo === 'desde') setDesde(valor)
    else setHasta(valor)
  }

  const handleCsv = async () => {
    try {
      await reportesApi.descargarVentasCsv({ desde, hasta })
      toast.success('CSV generado', 'Se descargó el reporte del rango seleccionado')
    } catch (err) {
      toast.error('No se pudo exportar', err.message)
    }
  }

  const k = data?.kpis
  const v = data?.variacion || {}

  const totalEstado = useMemo(
    () => (data?.porEstado || []).reduce((a, e) => a + e.cantidad, 0),
    [data]
  )

  const maxProducto = data?.topProductos?.[0]?.monto || 0
  const maxCategoria = data?.porCategoria?.[0]?.monto || 0

  const rotularRango = data?.rango?.completo
    ? 'Todo el histórico'
    : `${fechaLarga(data?.rango?.desde)} — ${fechaLarga(data?.rango?.hasta)}`

  if (cargando) {
    return (
      <div className='container py-5'>
        <div className='admin-page-header mb-4'>
          <h1 className='admin-page-header__title'>📊 Reportes del Sistema</h1>
        </div>
        <div className='row g-4'>
          {[0, 1, 2, 3].map((i) => (
            <div className='col-md-3' key={i}>
              <div className='card border-0 shadow-sm p-4' style={{ height: 140 }}>
                <div className='placeholder-glow'>
                  <span className='placeholder col-6 mb-3' />
                  <span className='placeholder col-9' style={{ height: 28 }} />
                </div>
              </div>
            </div>
          ))}
          <div className='col-12'>
            <div className='card border-0 shadow-sm p-4' style={{ height: 320 }}>
              <div className='placeholder-glow'><span className='placeholder col-12' style={{ height: 260 }} /></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Si la primera carga falló, data sigue en null: sin este corte el render
  // de abajo reventaría al leer data.kpis.
  if (!data) {
    return (
      <div className='container py-5'>
        <div className='admin-page-header mb-4'>
          <h1 className='admin-page-header__title'>📊 Reportes del Sistema</h1>
        </div>
        <div className='card border-0 shadow-sm rounded-4 p-5 text-center'>
          <AlertTriangle size={32} className='text-danger mx-auto mb-3' />
          <h5 className='fw-bold'>No se pudo cargar el reporte</h5>
          <p className='text-muted mb-1'>{error?.mensaje || 'El servidor no respondió.'}</p>
          {error?.pista && <p className='small text-muted'>{error.pista}</p>}
          <button className='btn btn-primary btn-sm mx-auto' style={{ maxWidth: 180 }} onClick={cargar}>
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className='container py-5 report-page'>
      <div className='admin-page-header mb-4'>
        <div>
          <h1 className='admin-page-header__title'>📊 Reportes del Sistema</h1>
          <p className='admin-page-header__sub'>Ventas netas, pedidos e inventario · {rotularRango}</p>
          <div className='admin-page-header__badges mt-2'>
            <span className='admin-badge'>🧮 Calculado en el servidor</span>
            <span className='admin-badge'>🚫 Excluye pedidos cancelados</span>
          </div>
        </div>
        <div className='d-flex gap-2 no-print'>
          <button className='btn btn-outline-light d-flex align-items-center gap-2' onClick={handleCsv}>
            <Download size={16} /> Exportar CSV
          </button>
          <button className='btn btn-outline-light d-flex align-items-center gap-2' onClick={() => window.print()}>
            <Printer size={16} /> Imprimir
          </button>
        </div>
      </div>

      {/* Una sola fila de filtros arriba de todo: cada gráfico se redibuja
          contra el mismo rango, nunca con filtros propios. */}
      <div className='card border-0 shadow-sm rounded-4 p-3 mb-4 no-print'>
        <div className='d-flex flex-wrap align-items-center gap-2'>
          <span className='d-flex align-items-center gap-2 text-muted small fw-semibold me-2'>
            <CalendarRange size={16} /> Período
          </span>

          {PRESETS.map((p) => (
            <button
              key={p.id}
              type='button'
              className={`btn btn-sm ${presetId === p.id ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => aplicarPreset(p)}
            >
              {p.label}
            </button>
          ))}

          <span className='vr mx-2 d-none d-lg-block' />

          <input
            type='date'
            className='form-control form-control-sm'
            style={{ maxWidth: '150px' }}
            value={desde}
            max={hasta || undefined}
            onChange={(e) => cambiarFecha('desde', e.target.value)}
            aria-label='Fecha inicio'
          />
          <span className='text-muted'>—</span>
          <input
            type='date'
            className='form-control form-control-sm'
            style={{ maxWidth: '150px' }}
            value={hasta}
            min={desde || undefined}
            onChange={(e) => cambiarFecha('hasta', e.target.value)}
            aria-label='Fecha fin'
          />
        </div>
      </div>

      {error && (
        <div className='alert alert-danger d-flex justify-content-between align-items-start gap-3'>
          <div>
            <strong className='d-block'>{error.mensaje}</strong>
            {error.pista && <span className='small'>{error.pista}</span>}
          </div>
          <button className='btn btn-sm btn-outline-danger no-print flex-shrink-0' onClick={cargar}>Reintentar</button>
        </div>
      )}

      {/* Al recargar se atenúa el contenido anterior en vez de reemplazarlo
          por un esqueleto: sin salto de layout ni parpadeo. */}
      <div style={{ opacity: refrescando ? 0.55 : 1, transition: 'opacity .15s ease' }}>

        {/* ── KPIs ── */}
        <div className='row g-4 mb-4'>
          <div className='col-6 col-lg-3'>
            <KpiCard
              icono={TrendingUp}
              titulo='Ventas netas'
              valor={formatCurrency(k.ventas)}
              delta={v.ventas}
              nota={data.comparativa ? 'vs. período anterior' : null}
            />
          </div>
          <div className='col-6 col-lg-3'>
            <KpiCard
              icono={ShoppingBag}
              titulo='Pedidos'
              valor={k.pedidos}
              delta={v.pedidos}
              nota={k.cancelados > 0 ? `${k.cancelados} cancelados (${k.tasaCancelacion}%)` : null}
            />
          </div>
          <div className='col-6 col-lg-3'>
            <KpiCard
              icono={Receipt}
              titulo='Ticket promedio'
              valor={formatCurrency(k.ticket)}
              delta={v.ticket}
            />
          </div>
          <div className='col-6 col-lg-3'>
            <KpiCard
              icono={Boxes}
              titulo='Unidades vendidas'
              valor={k.unidades}
              delta={v.unidades}
            />
          </div>
        </div>

        {/* ── Tendencia diaria ── */}
        <div className='card shadow-sm border-0 rounded-4 p-4 mb-4 page-break-avoid'>
          <h5 className='fw-bold mb-1'>Tendencia de ventas</h5>
          <p className='text-muted small mb-4'>Ventas netas por día, sin contar pedidos cancelados</p>

          {data.porDia.length === 0 ? (
            <p className='text-muted mb-0'>No hay pedidos en este rango.</p>
          ) : (
            <ResponsiveContainer width='100%' height={300}>
              <LineChart data={data.porDia} margin={{ top: 8, left: 8, right: 16, bottom: 8 }}>
                <CartesianGrid vertical={false} stroke={tema.grid} />
                <XAxis
                  dataKey='fecha'
                  tickFormatter={diaMes}
                  tick={{ fontSize: 12, fill: tema.texto }}
                  tickLine={false}
                  axisLine={{ stroke: tema.grid }}
                  minTickGap={24}
                />
                <YAxis
                  tickFormatter={montoCorto}
                  tick={{ fontSize: 12, fill: tema.texto }}
                  tickLine={false}
                  axisLine={false}
                  width={64}
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(value), 'Ventas netas']}
                  labelFormatter={fechaLarga}
                  contentStyle={{ borderRadius: 10, border: `1px solid ${tema.grid}`, background: tema.superficie }}
                />
                <Line
                  // 'linear', no 'monotone': con días en cero la curva suave
                  // inventa subidas y bajadas que no ocurrieron.
                  type='linear'
                  dataKey='ventas'
                  stroke={tema.serie}
                  strokeWidth={2}
                  // Con pocos días la línea sola casi no se ve, y con un solo
                  // punto directamente no dibuja nada: ahí sí van marcadores.
                  dot={data.porDia.length < 8 ? { r: 3, strokeWidth: 0 } : false}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: tema.superficie }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className='row g-4 mb-4'>
          {/* ── Top productos ── */}
          <div className='col-lg-7'>
            <div className='card shadow-sm border-0 rounded-4 p-4 h-100 page-break-avoid'>
              <div className='d-flex align-items-center gap-2 mb-1'>
                <div className='icon-badge icon-badge--orange'><Trophy size={18} /></div>
                <h5 className='fw-bold mb-0'>Productos más vendidos</h5>
              </div>
              <p className='text-muted small mb-4'>Por monto facturado en el rango</p>

              {data.topProductos.length === 0 ? (
                <p className='text-muted mb-0'>Aún no hay ventas en este rango.</p>
              ) : (
                <>
                  <ResponsiveContainer width='100%' height={40 + data.topProductos.length * 38}>
                    <BarChart
                      data={data.topProductos}
                      layout='vertical'
                      margin={{ top: 4, left: 8, right: 16, bottom: 4 }}
                      barCategoryGap='22%'
                    >
                      <CartesianGrid horizontal={false} stroke={tema.grid} />
                      <XAxis type='number' tickFormatter={montoCorto} tick={{ fontSize: 11, fill: tema.texto }} tickLine={false} axisLine={false} />
                      <YAxis
                        type='category'
                        dataKey='nombre'
                        width={152}
                        tick={{ fontSize: 11, fill: tema.texto }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(n) => (n.length > 24 ? `${n.slice(0, 24)}…` : n)}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(148,163,184,.12)' }}
                        formatter={(value) => [formatCurrency(value), 'Facturado']}
                        contentStyle={{ borderRadius: 10, border: `1px solid ${tema.grid}`, background: tema.superficie }}
                      />
                      <Bar dataKey='monto' fill={tema.serie} radius={[0, 4, 4, 0]} maxBarSize={22} />
                    </BarChart>
                  </ResponsiveContainer>

                  {/* Vista de tabla: los mismos valores sin depender del color
                      ni del tooltip, y es lo que se lee al imprimir. */}
                  <div className='table-responsive mt-3'>
                    <table className='table table-sm align-middle mb-0 report-tabla'>
                      <thead>
                        <tr>
                          <th scope='col'>Producto</th>
                          <th scope='col' className='text-end'>Unidades</th>
                          <th scope='col' className='text-end'>Facturado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.topProductos.map((p) => (
                          <tr key={p.idPro}>
                            <td>{p.nombre}</td>
                            <td className='text-end'>{p.unidades}</td>
                            <td className='text-end fw-semibold'>{formatCurrency(p.monto)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Pedidos por estado ── */}
          <div className='col-lg-5'>
            <div className='card shadow-sm border-0 rounded-4 p-4 h-100 page-break-avoid'>
              <h5 className='fw-bold mb-1'>Pedidos por estado</h5>
              <p className='text-muted small mb-3'>{totalEstado} pedidos en el rango</p>

              {data.porEstado.length === 0 ? (
                <p className='text-muted mb-0'>No hay pedidos en este rango.</p>
              ) : (
                <>
                  <ResponsiveContainer width='100%' height={200}>
                    <PieChart>
                      <Pie
                        data={data.porEstado}
                        dataKey='cantidad'
                        nameKey='estado'
                        innerRadius={52}
                        outerRadius={82}
                        paddingAngle={2}
                        stroke={tema.superficie}
                        strokeWidth={2}
                      >
                        {data.porEstado.map((e) => (
                          <Cell key={e.estado} fill={ESTADO_COLOR[e.estado] || '#94A3B8'} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [`${value} pedidos`, name]}
                        contentStyle={{ borderRadius: 10, border: `1px solid ${tema.grid}`, background: tema.superficie }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* El nombre y el conteo van siempre al lado del color: rojo y
                      verde son difíciles de separar con daltonismo deutan. */}
                  <ul className='list-unstyled mb-0 mt-3'>
                    {data.porEstado.map((e) => (
                      <li key={e.estado} className='d-flex align-items-center justify-content-between py-1'>
                        <span className='d-flex align-items-center gap-2 small'>
                          <span
                            aria-hidden='true'
                            style={{
                              width: 10, height: 10, borderRadius: 3, flexShrink: 0,
                              background: ESTADO_COLOR[e.estado] || '#94A3B8',
                            }}
                          />
                          {e.estado}
                        </span>
                        <span className='small text-muted'>
                          <strong className='text-body'>{e.cantidad}</strong>
                          {totalEstado > 0 && ` · ${Math.round((e.cantidad / totalEstado) * 100)}%`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>

        <div className='row g-4'>
          {/* ── Ventas por categoría ── */}
          <div className='col-md-6'>
            <div className='card shadow-sm border-0 rounded-4 p-4 h-100 page-break-avoid'>
              <div className='d-flex align-items-center gap-2 mb-1'>
                <div className='icon-badge'><Layers size={18} /></div>
                <h5 className='fw-bold mb-0'>Ventas por categoría</h5>
              </div>
              <p className='text-muted small mb-4'>Dónde se concentra la facturación</p>

              {data.porCategoria.length === 0 ? (
                <p className='text-muted mb-0'>Aún no hay ventas en este rango.</p>
              ) : (
                <BarraLista
                  max={maxCategoria}
                  items={data.porCategoria.map((c) => ({
                    clave: c.categoria,
                    etiqueta: c.categoria,
                    monto: c.monto,
                    detalle: `${c.unidades} unidades`,
                  }))}
                />
              )}
            </div>
          </div>

          {/* ── Inventario crítico ── */}
          <div className='col-md-6'>
            <div className='card shadow-sm border-0 rounded-4 p-4 h-100 page-break-avoid'>
              <div className='d-flex justify-content-between align-items-center mb-1'>
                <div className='d-flex align-items-center gap-2'>
                  <div className='icon-badge icon-badge--red'><AlertTriangle size={18} /></div>
                  <h5 className='fw-bold mb-0'>Inventario crítico</h5>
                </div>
                {data.inventarioCritico.length > 0 && (
                  <span className='badge bg-danger-subtle text-danger'>{data.inventarioCritico.length}</span>
                )}
              </div>
              <p className='text-muted small mb-4'>
                Agotados y con {data.umbralStockBajo} unidades o menos
              </p>

              {data.inventarioCritico.length === 0 ? (
                <p className='text-muted mb-0'>Ningún producto está en nivel crítico.</p>
              ) : (
                <div className='d-flex flex-column gap-2'>
                  {data.inventarioCritico.map((p) => (
                    <div key={p.idPro} className='d-flex justify-content-between align-items-center border rounded-3 p-2 px-3'>
                      <span className='fw-semibold small text-truncate'>{p.nombre}</span>
                      <span className={`badge ${p.stock === 0 ? 'bg-danger-subtle text-danger' : 'bg-warning-subtle text-warning'}`}>
                        {p.stock === 0 ? 'Sin stock' : `${p.stock} uds.`}
                      </span>
                    </div>
                  ))}
                  <Link
                    to='/admin/inventario'
                    className='btn btn-outline-danger btn-sm mt-2 d-flex align-items-center justify-content-center gap-2 no-print'
                  >
                    Ir a Inventario
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        <p className='text-muted small text-center mt-4 mb-0'>
          Reporte generado el {new Date(data.generadoEn).toLocaleString('es-CO')} · ComVibes
        </p>
      </div>
    </div>
  )
}

export default Reports
