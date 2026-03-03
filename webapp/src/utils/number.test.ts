import { describe, expect, it } from 'vitest'
import { parseAmountInput } from './number'

describe('parseAmountInput', () => {
  it('parsea montos con coma decimal', () => {
    expect(parseAmountInput('575344,63')).toBeCloseTo(575344.63, 6)
  })

  it('parsea montos con punto decimal', () => {
    expect(parseAmountInput('575344.63')).toBeCloseTo(575344.63, 6)
  })

  it('parsea montos con separador de miles mixto', () => {
    expect(parseAmountInput('1.234.567,89')).toBeCloseTo(1234567.89, 6)
  })

  it('retorna null para input invalido', () => {
    expect(parseAmountInput('abc')).toBeNull()
  })
})
