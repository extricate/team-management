import { describe, it, expect } from 'vitest'
import {
  detectFinancialConflicts,
  evaluateSourceAmountConflicts,
  calcUtilizationPercent,
  type ConflictAmount,
  type SourceAmountWithAllocations,
} from '@/lib/financial-conflicts'


function makeAmount(overrides: Partial<ConflictAmount> = {}): ConflictAmount {
  return {
    amount: 100_000,
    status: 'released',
    releaseDate: null,
    type: { type: 'PERSEX', year: 2025 },
    allocations: [],
    ...overrides,
  }
}

function activeAlloc(amount: number, startDate: Date | null = null) {
  return { status: 'active', amount, startDate }
}

describe('detectFinancialConflicts', () => {
  it('returns empty array for no amounts', () => {
    expect(detectFinancialConflicts([])).toHaveLength(0)
  })

  it('returns empty array when amounts have no allocations', () => {
    expect(detectFinancialConflicts([makeAmount()])).toHaveLength(0)
  })

  it('returns empty array when total allocation is exactly equal to amount', () => {
    const amount = makeAmount({ amount: 50_000, allocations: [activeAlloc(50_000)] })
    expect(detectFinancialConflicts([amount])).toHaveLength(0)
  })

  it('returns empty array when total allocation is below amount', () => {
    const amount = makeAmount({ amount: 50_000, allocations: [activeAlloc(30_000)] })
    expect(detectFinancialConflicts([amount])).toHaveLength(0)
  })

  it('returns error when total allocation exceeds amount', () => {
    const amount = makeAmount({ amount: 50_000, allocations: [activeAlloc(60_000)] })
    const result = detectFinancialConflicts([amount])
    expect(result).toHaveLength(1)
    expect(result[0].severity).toBe('error')
    expect(result[0].message).toContain('PERSEX 2025')
  })

  it('over-allocation error only counts active allocations', () => {
    const amount = makeAmount({
      amount: 50_000,
      allocations: [
        activeAlloc(40_000),
        { status: 'reallocated', amount: 30_000, startDate: null },
      ],
    })
    expect(detectFinancialConflicts([amount])).toHaveLength(0)
  })

  it('returns warning when active allocations are linked to concept amount', () => {
    const amount = makeAmount({ status: 'concept', allocations: [activeAlloc(10_000)] })
    const result = detectFinancialConflicts([amount])
    expect(result).toHaveLength(1)
    expect(result[0].severity).toBe('warning')
    expect(result[0].message).toContain('conceptbedrag')
  })

  it('does not warn about concept amounts with no active allocations', () => {
    const amount = makeAmount({
      status: 'concept',
      allocations: [{ status: 'reallocated', amount: 5_000, startDate: null }],
    })
    expect(detectFinancialConflicts([amount])).toHaveLength(0)
  })

  it('returns warning when allocation starts before release date', () => {
    const releaseDate = new Date('2025-06-01')
    const amount = makeAmount({
      releaseDate,
      allocations: [activeAlloc(10_000, new Date('2025-01-01'))],
    })
    const result = detectFinancialConflicts([amount])
    expect(result).toHaveLength(1)
    expect(result[0].severity).toBe('warning')
    expect(result[0].message).toContain('vrijgavedatum')
  })

  it('does not warn when allocation start equals release date', () => {
    const d = new Date('2025-06-01')
    const amount = makeAmount({ releaseDate: d, allocations: [activeAlloc(10_000, d)] })
    expect(detectFinancialConflicts([amount])).toHaveLength(0)
  })

  it('does not warn when allocation start is after release date', () => {
    const amount = makeAmount({
      releaseDate: new Date('2025-01-01'),
      allocations: [activeAlloc(10_000, new Date('2025-06-01'))],
    })
    expect(detectFinancialConflicts([amount])).toHaveLength(0)
  })

  it('emits only one date-mismatch warning per amount even with multiple early allocations', () => {
    const releaseDate = new Date('2025-06-01')
    const amount = makeAmount({
      releaseDate,
      allocations: [
        activeAlloc(10_000, new Date('2025-01-01')),
        activeAlloc(5_000, new Date('2025-02-01')),
      ],
    })
    const result = detectFinancialConflicts([amount])
    const dateWarnings = result.filter(c => c.message.includes('vrijgavedatum'))
    expect(dateWarnings).toHaveLength(1)
  })

  it('accumulates multiple conflict types for the same amount', () => {
    const amount = makeAmount({
      amount: 10_000,
      status: 'concept',
      allocations: [activeAlloc(20_000)],
    })
    const result = detectFinancialConflicts([amount])
    expect(result.some(c => c.severity === 'error')).toBe(true)
    expect(result.some(c => c.severity === 'warning' && c.message.includes('conceptbedrag'))).toBe(true)
  })

  it('uses "Ongetypeerd bedrag" label when financialType is null', () => {
    const amount = makeAmount({ type: null, amount: 5_000, allocations: [activeAlloc(9_000)] })
    const result = detectFinancialConflicts([amount])
    expect(result[0].message).toContain('Ongetypeerd bedrag')
  })

  it('collects conflicts from multiple amounts independently', () => {
    const over = makeAmount({ amount: 1_000, allocations: [activeAlloc(2_000)] })
    const concept = makeAmount({ status: 'concept', type: { type: 'MATEX', year: 2025 }, allocations: [activeAlloc(500)] })
    const result = detectFinancialConflicts([over, concept])
    expect(result).toHaveLength(2)
  })
})


describe('evaluateSourceAmountConflicts', () => {
  function makeSource(overrides: Partial<SourceAmountWithAllocations> = {}): SourceAmountWithAllocations {
    return {
      amount: 100_000,
      status: 'released',
      releaseDate: null,
      type: { type: 'PERSEX', year: 2025 },
      allocations: [],
      ...overrides,
    }
  }

  it('returns no conflicts when existing + extra allocation is within budget', () => {
    const source = makeSource({ allocations: [{ status: 'active', amount: 40_000, startDate: null }] })
    expect(evaluateSourceAmountConflicts(source, { amount: '50000', startDate: null })).toHaveLength(0)
  })

  it('returns an error when existing + extra allocation exceeds budget', () => {
    const source = makeSource({ allocations: [{ status: 'active', amount: 80_000, startDate: null }] })
    const result = evaluateSourceAmountConflicts(source, { amount: '30000', startDate: null })
    expect(result).toHaveLength(1)
    expect(result[0].severity).toBe('error')
  })

  it('treats null extra amount as zero', () => {
    const source = makeSource({ allocations: [{ status: 'active', amount: 100_000, startDate: null }] })
    expect(evaluateSourceAmountConflicts(source, { amount: null, startDate: null })).toHaveLength(0)
  })

  it('returns warning when extra allocation starts before release date', () => {
    const releaseDate = new Date('2025-06-01')
    const source = makeSource({ releaseDate })
    const result = evaluateSourceAmountConflicts(source, { amount: '10000', startDate: new Date('2025-01-01') })
    expect(result.some(c => c.severity === 'warning' && c.message.includes('vrijgavedatum'))).toBe(true)
  })

  it('returns warning when source amount is concept', () => {
    const source = makeSource({ status: 'concept' })
    const result = evaluateSourceAmountConflicts(source, { amount: '10000', startDate: null })
    expect(result.some(c => c.severity === 'warning' && c.message.includes('conceptbedrag'))).toBe(true)
  })
})

describe('calcUtilizationPercent', () => {
  it('returns 0 when nothing is allocated', () => {
    expect(calcUtilizationPercent(0, 100_000)).toBe(0)
  })

  it('returns 100 at full utilization', () => {
    expect(calcUtilizationPercent(100_000, 100_000)).toBe(100)
  })

  it('returns >100 when over budget', () => {
    expect(calcUtilizationPercent(150_000, 100_000)).toBe(150)
  })

  it('returns 0 when budget is zero', () => {
    expect(calcUtilizationPercent(50_000, 0)).toBe(0)
  })
})
