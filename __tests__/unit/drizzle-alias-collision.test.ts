import { describe, it, expect } from 'vitest'

// Drizzle builds JOIN aliases by joining the relation-path components with '_'.
// PostgreSQL silently truncates identifiers to 63 bytes. When two sibling
// relations share the same 63-char prefix the query fails with:
//   "table name ... specified more than once"
//
// This suite guards the known-deep relation paths. If a future rename causes a
// collision here, the test fails before it reaches production.

const PG_MAX = 63

function pgAlias(path: string[]): string {
  return path.join('_').slice(0, PG_MAX)
}

function assertNoCollisions(paths: string[][]): void {
  const aliases = paths.map(pgAlias)
  const unique = new Set(aliases)
  expect(unique.size).toBe(aliases.length)
}

describe('Drizzle join-alias collision guard', () => {
  it('bestellingen → fundingAllocations → financialSourceAmount siblings', () => {
    // Regression: 'financialSource' and 'financialType' both truncated to
    // 'bestellingen_fundingAllocations_financialSourceAmount_financial' (63 chars).
    // Fixed by renaming the Drizzle relation 'financialType' → 'type'.
    const prefix = ['bestellingen', 'fundingAllocations', 'financialSourceAmount']
    assertNoCollisions([
      [...prefix, 'financialSource'],
      [...prefix, 'type'],
    ])
  })

  it('positions → fundingAllocations → financialSourceAmount siblings', () => {
    const prefix = ['positions', 'fundingAllocations', 'financialSourceAmount']
    assertNoCollisions([
      [...prefix, 'financialSource'],
      [...prefix, 'type'],
    ])
  })

  it('teams → positions → fundingAllocations → financialSourceAmount siblings', () => {
    const prefix = ['teams', 'positions', 'fundingAllocations', 'financialSourceAmount']
    assertNoCollisions([
      [...prefix, 'financialSource'],
      [...prefix, 'type'],
    ])
  })

  it('financialSources → amounts siblings', () => {
    const prefix = ['financialSources', 'amounts']
    assertNoCollisions([
      [...prefix, 'financialSource'],
      [...prefix, 'type'],
      [...prefix, 'allocations'],
    ])
  })
})
