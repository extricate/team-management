import { describe, it, expect } from 'vitest'
import { findBestMatch, calculateTotalCost } from '@/lib/salarisschalen'
import type { Salarisschaal } from '@/lib/db/schema'

function makeSchaal(overrides: Partial<Salarisschaal> = {}): Salarisschaal {
  return {
    id: 'schaal-1',
    schaalCode: '10',
    year: 2025,
    primaryCost: '80000.00',
    secondaryEffects: '20000.00',
    tertiaryEffects: '5000.00',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  }
}

// ── calculateTotalCost ─────────────────────────────────────────────────────────

describe('calculateTotalCost', () => {
  it('sums primary + secondary + tertiary costs', () => {
    const schaal = makeSchaal({ primaryCost: '80000.00', secondaryEffects: '20000.00', tertiaryEffects: '5000.00' })
    expect(calculateTotalCost(schaal)).toBe(105000)
  })

  it('handles zero secondary and tertiary effects', () => {
    const schaal = makeSchaal({ primaryCost: '60000.00', secondaryEffects: '0', tertiaryEffects: '0' })
    expect(calculateTotalCost(schaal)).toBe(60000)
  })

  it('handles decimal amounts correctly', () => {
    const schaal = makeSchaal({ primaryCost: '75432.50', secondaryEffects: '18750.25', tertiaryEffects: '3000.10' })
    expect(calculateTotalCost(schaal)).toBeCloseTo(97182.85, 2)
  })
})

// ── findBestMatch ──────────────────────────────────────────────────────────────

describe('findBestMatch', () => {
  it('returns null result when list is empty', () => {
    const result = findBestMatch([], '10', 2025)
    expect(result.schaal).toBeNull()
  })

  it('returns exact match when schaalCode and year match', () => {
    const schalen = [makeSchaal({ schaalCode: '10', year: 2025 })]
    const result = findBestMatch(schalen, '10', 2025)
    expect(result.schaal).not.toBeNull()
    expect(result.isExact).toBe(true)
    expect(result.foundYear).toBe(2025)
  })

  it('returns null when schaalCode does not match', () => {
    const schalen = [makeSchaal({ schaalCode: '12', year: 2025 })]
    const result = findBestMatch(schalen, '10', 2025)
    expect(result.schaal).toBeNull()
  })

  it('falls back to nearest year when exact year is not found', () => {
    const schalen = [
      makeSchaal({ schaalCode: '10', year: 2023 }),
      makeSchaal({ id: 'schaal-2', schaalCode: '10', year: 2024 }),
    ]
    const result = findBestMatch(schalen, '10', 2025)
    expect(result.schaal).not.toBeNull()
    expect(result.isExact).toBe(false)
    expect(result.foundYear).toBe(2024)
  })

  it('prefers closer past year over farther future year', () => {
    const schalen = [
      makeSchaal({ schaalCode: '10', year: 2024 }),
      makeSchaal({ id: 'schaal-2', schaalCode: '10', year: 2027 }),
    ]
    const result = findBestMatch(schalen, '10', 2025)
    expect(result.foundYear).toBe(2024)
  })

  it('falls back to future year when no past year exists', () => {
    const schalen = [makeSchaal({ schaalCode: '10', year: 2027 })]
    const result = findBestMatch(schalen, '10', 2025)
    expect(result.schaal).not.toBeNull()
    expect(result.isExact).toBe(false)
    expect(result.foundYear).toBe(2027)
  })

  it('case-insensitively matches military rank codes', () => {
    const schalen = [makeSchaal({ schaalCode: 'KOL', year: 2025 })]
    const result = findBestMatch(schalen, 'kol', 2025)
    expect(result.schaal).not.toBeNull()
    expect(result.isExact).toBe(true)
  })

  it('picks exact year over closer non-exact when exact exists among multiple codes', () => {
    const schalen = [
      makeSchaal({ schaalCode: '10', year: 2024 }),
      makeSchaal({ id: 'schaal-2', schaalCode: '10', year: 2025 }),
    ]
    const result = findBestMatch(schalen, '10', 2025)
    expect(result.isExact).toBe(true)
    expect(result.foundYear).toBe(2025)
  })
})
