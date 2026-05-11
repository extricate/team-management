import { describe, it, expect } from 'vitest'
import {
  detectBestellingConflicts,
  calculateBestellingAllocation,
  isValidBestellingFinancialType,
  type BestellingConflictInput,
  type BestellingAllocationInput,
} from '@/lib/bestellingen'

function makeBestelling(overrides: Partial<BestellingConflictInput['bestelling']> = {}): BestellingConflictInput['bestelling'] {
  return {
    id: 'bestelling-1',
    geraamdBedrag: '100000',
    ...overrides,
  }
}

function makeAllocation(amount: string, status = 'active') {
  return { id: `alloc-${Math.random()}`, amount, percentage: null, status } as BestellingConflictInput['allocations'][number]
}

function makeSourceAmount(overrides: Partial<BestellingConflictInput['sourceAmounts'][number]> = {}): BestellingConflictInput['sourceAmounts'][number] {
  return {
    id: 'sa-1',
    status: 'released',
    financialType: { type: 'MATEX', year: 2025 },
    ...overrides,
  }
}

// ── isValidBestellingFinancialType ──────────────────────────────────────────────

describe('isValidBestellingFinancialType', () => {
  it('accepts MATEX', () => {
    expect(isValidBestellingFinancialType('MATEX')).toBe(true)
  })

  it('accepts Investeringen', () => {
    expect(isValidBestellingFinancialType('Investeringen')).toBe(true)
  })

  it('rejects PERSEX', () => {
    expect(isValidBestellingFinancialType('PERSEX')).toBe(false)
  })

  it('rejects geen', () => {
    expect(isValidBestellingFinancialType('geen')).toBe(false)
  })
})

// ── detectBestellingConflicts ───────────────────────────────────────────────────

describe('detectBestellingConflicts', () => {
  it('returns empty when bestelling has no geraamdBedrag and no allocations', () => {
    const result = detectBestellingConflicts({
      bestelling: makeBestelling({ geraamdBedrag: null }),
      allocations: [],
      sourceAmounts: [],
    })
    expect(result).toHaveLength(0)
  })

  it('returns geen-financiering when geraamdBedrag is set but no active allocations', () => {
    const result = detectBestellingConflicts({
      bestelling: makeBestelling({ geraamdBedrag: '50000' }),
      allocations: [makeAllocation('50000', 'reallocated')],
      sourceAmounts: [],
    })
    expect(result.some(c => c.type === 'geen-financiering')).toBe(true)
  })

  it('returns over-geraamd when total allocated exceeds geraamdBedrag', () => {
    const result = detectBestellingConflicts({
      bestelling: makeBestelling({ geraamdBedrag: '50000' }),
      allocations: [makeAllocation('60000')],
      sourceAmounts: [],
    })
    expect(result.some(c => c.type === 'over-geraamd')).toBe(true)
    expect(result.find(c => c.type === 'over-geraamd')?.severity).toBe('warning')
  })

  it('does not flag over-geraamd when allocated equals geraamdBedrag exactly', () => {
    const result = detectBestellingConflicts({
      bestelling: makeBestelling({ geraamdBedrag: '50000' }),
      allocations: [makeAllocation('50000')],
      sourceAmounts: [],
    })
    expect(result.some(c => c.type === 'over-geraamd')).toBe(false)
  })

  it('returns verkeerde-bron when funded from PERSEX', () => {
    const result = detectBestellingConflicts({
      bestelling: makeBestelling(),
      allocations: [makeAllocation('10000')],
      sourceAmounts: [makeSourceAmount({ financialType: { type: 'PERSEX', year: 2025 } })],
    })
    expect(result.some(c => c.type === 'verkeerde-bron')).toBe(true)
    expect(result.find(c => c.type === 'verkeerde-bron')?.severity).toBe('error')
  })

  it('returns verkeerde-bron when funded from geen', () => {
    const result = detectBestellingConflicts({
      bestelling: makeBestelling(),
      allocations: [makeAllocation('10000')],
      sourceAmounts: [makeSourceAmount({ financialType: { type: 'geen', year: 2025 } })],
    })
    expect(result.some(c => c.type === 'verkeerde-bron')).toBe(true)
  })

  it('does not flag verkeerde-bron for MATEX', () => {
    const result = detectBestellingConflicts({
      bestelling: makeBestelling(),
      allocations: [makeAllocation('10000')],
      sourceAmounts: [makeSourceAmount({ financialType: { type: 'MATEX', year: 2025 } })],
    })
    expect(result.some(c => c.type === 'verkeerde-bron')).toBe(false)
  })

  it('does not flag verkeerde-bron for Investeringen', () => {
    const result = detectBestellingConflicts({
      bestelling: makeBestelling(),
      allocations: [makeAllocation('10000')],
      sourceAmounts: [makeSourceAmount({ financialType: { type: 'Investeringen', year: 2025 } })],
    })
    expect(result.some(c => c.type === 'verkeerde-bron')).toBe(false)
  })

  it('returns concept-budget when funded from unreleased amount', () => {
    const result = detectBestellingConflicts({
      bestelling: makeBestelling(),
      allocations: [makeAllocation('10000')],
      sourceAmounts: [makeSourceAmount({ status: 'concept' })],
    })
    expect(result.some(c => c.type === 'concept-budget')).toBe(true)
    expect(result.find(c => c.type === 'concept-budget')?.severity).toBe('warning')
  })

  it('does not flag concept-budget when amount is released', () => {
    const result = detectBestellingConflicts({
      bestelling: makeBestelling(),
      allocations: [makeAllocation('10000')],
      sourceAmounts: [makeSourceAmount({ status: 'released' })],
    })
    expect(result.some(c => c.type === 'concept-budget')).toBe(false)
  })

  it('returns no geen-financiering when geraamdBedrag is null', () => {
    const result = detectBestellingConflicts({
      bestelling: makeBestelling({ geraamdBedrag: null }),
      allocations: [],
      sourceAmounts: [],
    })
    expect(result.some(c => c.type === 'geen-financiering')).toBe(false)
  })

  it('can return multiple conflict types at once', () => {
    const result = detectBestellingConflicts({
      bestelling: makeBestelling({ geraamdBedrag: '10000' }),
      allocations: [makeAllocation('20000')],
      sourceAmounts: [makeSourceAmount({ status: 'concept', financialType: { type: 'PERSEX', year: 2025 } })],
    })
    const types = result.map(c => c.type)
    expect(types).toContain('over-geraamd')
    expect(types).toContain('verkeerde-bron')
    expect(types).toContain('concept-budget')
  })
})

// ── calculateBestellingAllocation ──────────────────────────────────────────────

describe('calculateBestellingAllocation', () => {
  it('returns zero totals when no allocations', () => {
    const result = calculateBestellingAllocation({
      geraamdBedrag: '100000',
      allocations: [],
    })
    expect(result.geraamd).toBe(100000)
    expect(result.toegewezen).toBe(0)
    expect(result.beschikbaar).toBe(100000)
  })

  it('sums only active allocations', () => {
    const allocations: BestellingAllocationInput['allocations'] = [
      { amount: '40000', status: 'active' },
      { amount: '30000', status: 'reallocated' },
    ]
    const result = calculateBestellingAllocation({ geraamdBedrag: '100000', allocations })
    expect(result.toegewezen).toBe(40000)
    expect(result.beschikbaar).toBe(60000)
  })

  it('handles null geraamdBedrag as zero', () => {
    const result = calculateBestellingAllocation({ geraamdBedrag: null, allocations: [] })
    expect(result.geraamd).toBe(0)
    expect(result.beschikbaar).toBe(0)
  })

  it('beschikbaar can be negative when over-allocated', () => {
    const allocations: BestellingAllocationInput['allocations'] = [
      { amount: '120000', status: 'active' },
    ]
    const result = calculateBestellingAllocation({ geraamdBedrag: '100000', allocations })
    expect(result.toegewezen).toBe(120000)
    expect(result.beschikbaar).toBe(-20000)
  })
})
