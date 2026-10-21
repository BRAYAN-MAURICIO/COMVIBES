import { describe, it, expect } from 'vitest'
import { formatCurrency, formatDate, truncate } from './formatters'

describe('formatters', () => {
  it('formatCurrency usa pesos colombianos sin decimales', () => {
    const texto = formatCurrency(1234567.8).replace(/\s/g, ' ')
    expect(texto).toMatch(/1\.234\.568/)
    expect(texto).toContain('$')
    expect(formatCurrency('abc')).toMatch(/0/)
  })

  it('formatDate no corre las fechas un día hacia atrás (bug corregido en ago 2026)', () => {
    // 'YYYY-MM-DD' antes se interpretaba como medianoche UTC y en Colombia
    // (UTC-5) se mostraba el día anterior.
    expect(formatDate('2026-08-15')).toBe('15/08/2026')
    expect(formatDate('2026-01-01')).toBe('01/01/2026')
  })

  it('formatDate tolera valores vacíos o inválidos', () => {
    expect(formatDate('')).toBe('')
    expect(formatDate(null)).toBe('')
    expect(formatDate('no-es-fecha')).toBe('no-es-fecha')
  })

  it('truncate corta con elipsis solo si hace falta', () => {
    expect(truncate('corto', 10)).toBe('corto')
    expect(truncate('una descripción larga', 3)).toBe('una…')
    expect(truncate(null)).toBe('')
  })
})
