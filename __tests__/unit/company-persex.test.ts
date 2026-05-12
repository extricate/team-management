import { describe, it, expect } from 'vitest'
import {
  summarizeCompanyPersex,
  type CompanyPersexBudget,
} from '@/lib/company-persex'

function makeBudget(overrides: Partial<CompanyPersexBudget> = {}): CompanyPersexBudget {
  return {
    id: 'budget-1',
    year: 2025,
    amount: 200_000,
    status: 'released',
    allocations: [],
    ...overrides,
  }
}

function alloc(amount: number) {
  return { status: 'active', amount }
}

function inactiveAlloc(amount: number) {
  return { status: 'reallocated', amount }
}

describe('summarizeCompanyPersex', () => {
  it('returns zeros when there are no budget years', () => {
    const result = summarizeCompanyPersex([])
    expect(result.totalBudget).toBe(0)
    expect(result.totalAllocated).toBe(0)
    expect(result.utilizationPercent).toBe(0)
    expect(result.conflicts).toHaveLength(0)
  })

  it('sums amount across all budget years', () => {
    const result = summarizeCompanyPersex([
      makeBudget({ year: 2025, amount: 100_000 }),
      makeBudget({ year: 2026, amount: 150_000, id: 'budget-2' }),
    ])
    expect(result.totalBudget).toBe(250_000)
  })

  it('counts only active allocations', () => {
    const result = summarizeCompanyPersex([
      makeBudget({ amount: 100_000, allocations: [alloc(60_000), inactiveAlloc(40_000)] }),
    ])
    expect(result.totalAllocated).toBe(60_000)
  })

  it('computes utilization percent correctly', () => {
    const result = summarizeCompanyPersex([
      makeBudget({ amount: 100_000, allocations: [alloc(75_000)] }),
    ])
    expect(result.utilizationPercent).toBe(75)
  })

  it('utilization can exceed 100 when over budget', () => {
    const result = summarizeCompanyPersex([
      makeBudget({ amount: 100_000, allocations: [alloc(150_000)] }),
    ])
    expect(result.utilizationPercent).toBe(150)
  })

  it('utilization is 0 when total budget is zero', () => {
    const result = summarizeCompanyPersex([
      makeBudget({ amount: 0, allocations: [alloc(50_000)] }),
    ])
    expect(result.utilizationPercent).toBe(0)
  })

  it('produces no conflict when within budget', () => {
    const result = summarizeCompanyPersex([
      makeBudget({ amount: 100_000, allocations: [alloc(80_000)] }),
    ])
    expect(result.conflicts).toHaveLength(0)
  })

  it('produces a warning (not error) when over budget', () => {
    const result = summarizeCompanyPersex([
      makeBudget({ amount: 100_000, allocations: [alloc(120_000)] }),
    ])
    expect(result.conflicts).toHaveLength(1)
    expect(result.conflicts[0].severity).toBe('warning')
  })

  it('over-budget warning message contains the utilization percentage', () => {
    const result = summarizeCompanyPersex([
      makeBudget({ amount: 100_000, allocations: [alloc(150_000)] }),
    ])
    expect(result.conflicts[0].message).toContain('150')
  })

  it('does not produce a conflict at exactly 100% utilization', () => {
    const result = summarizeCompanyPersex([
      makeBudget({ amount: 100_000, allocations: [alloc(100_000)] }),
    ])
    expect(result.conflicts).toHaveLength(0)
  })

  it('aggregates allocations across multiple years for utilization', () => {
    const result = summarizeCompanyPersex([
      makeBudget({ year: 2025, amount: 100_000, allocations: [alloc(60_000)] }),
      makeBudget({ year: 2026, amount: 100_000, allocations: [alloc(80_000)], id: 'b2' }),
    ])
    expect(result.totalAllocated).toBe(140_000)
    expect(result.totalBudget).toBe(200_000)
    expect(result.utilizationPercent).toBe(70)
  })

  it('produces a warning when aggregated total across years is over budget', () => {
    const result = summarizeCompanyPersex([
      makeBudget({ year: 2025, amount: 100_000, allocations: [alloc(80_000)] }),
      makeBudget({ year: 2026, amount: 50_000, allocations: [alloc(90_000)], id: 'b2' }),
    ])
    const overBudget = result.totalAllocated > result.totalBudget
    expect(overBudget).toBe(true)
    expect(result.conflicts.some(c => c.severity === 'warning')).toBe(true)
  })
})
