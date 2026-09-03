import { api, TOKEN_KEY } from './client'

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

/** Tarjetas globales del dashboard (sin rango de fechas). */
export const getResumen = () => api.get('/reportes/resumen')

/**
 * Informe completo del rango: KPIs, comparativa con el período anterior,
 * serie diaria, pedidos por estado, top de productos, ventas por categoría
 * e inventario crítico. Todo calculado en el backend.
 */
export const getVentas = ({ desde, hasta } = {}) =>
  api.get('/reportes/ventas', { params: { desde: desde || undefined, hasta: hasta || undefined } })

/**
 * Descarga el CSV del rango.
 *
 * No se puede usar un <a href> plano porque la ruta exige el header
 * Authorization: se pide con fetch y se descarga el blob resultante.
 */
export async function descargarVentasCsv({ desde, hasta } = {}) {
  const token = localStorage.getItem(TOKEN_KEY)
  const qs = new URLSearchParams()
  if (desde) qs.set('desde', desde)
  if (hasta) qs.set('hasta', hasta)

  const res = await fetch(`${API}/reportes/ventas.csv?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const json = await res.json().catch(() => null)
    throw new Error(json?.message || 'No se pudo generar el CSV.')
  }

  const blob = await res.blob()
  const nombre =
    res.headers.get('Content-Disposition')?.match(/filename="(.+?)"/)?.[1] ||
    'reporte-ventas-comvibes.csv'

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nombre
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
