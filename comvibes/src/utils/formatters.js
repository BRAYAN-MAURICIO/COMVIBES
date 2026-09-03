// utils/formatters.js

export const formatCurrency = (value) => {
  const num = Number(value) || 0
  return num.toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  })
}

export const formatDate = (value) => {
  if (!value) return ''
  // 'new Date("2026-08-15")' se interpreta como medianoche UTC, y al mostrarla
  // en Colombia (UTC-5) daba el 14: todas las fechas del sistema aparecían un
  // día antes. El backend manda las fechas como 'YYYY-MM-DD' (DATE_FORMAT), así
  // que se les agrega la hora para que se parseen en la zona local.
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? `${value}T00:00:00` : value
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export const truncate = (text, max = 100) => {
  if (!text) return ''
  return text.length > max ? `${text.slice(0, max)}…` : text
}
