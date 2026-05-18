import { describe, it, expect } from 'vitest'
import { fuzzyScore, filterFuncties } from '@/lib/functie-search'

describe('fuzzyScore', () => {
  it('returns 0 for an exact match', () => {
    expect(fuzzyScore('product owner', 'product owner')).toBe(0)
  })

  it('returns 1 when text starts with query', () => {
    expect(fuzzyScore('Product Owner', 'pro')).toBe(1)
  })

  it('returns 2 when text contains query as substring', () => {
    expect(fuzzyScore('Sr Product Owner', 'Product')).toBe(2)
  })

  it('returns 3 for a fuzzy match (chars in order, non-consecutive)', () => {
    expect(fuzzyScore('Product Owner', 'PO')).toBe(3)
  })

  it('returns null when there is no match', () => {
    expect(fuzzyScore('Informatiemanager', 'xyz')).toBeNull()
  })

  it('is case-insensitive', () => {
    expect(fuzzyScore('Informatiemanager', 'INFO')).toBe(1)
  })

  it('returns 0 for empty query', () => {
    expect(fuzzyScore('anything', '')).toBe(0)
  })

  it('matches "niet" in "Niet beschikbaar"', () => {
    expect(fuzzyScore('Niet beschikbaar', 'niet')).toBe(1)
  })

  it('matches "NB" in "Niet beschikbaar" via fuzzy', () => {
    expect(fuzzyScore('Niet beschikbaar', 'NB')).toBe(3)
  })
})

describe('filterFuncties', () => {
  const items = [
    { titel: 'Product Owner' },
    { titel: 'Sr Product Owner' },
    { titel: 'Informatiemanager' },
    { titel: 'Niet beschikbaar' },
  ]

  it('returns all items when query is empty', () => {
    expect(filterFuncties(items, '')).toHaveLength(4)
  })

  it('returns all items when query is only whitespace', () => {
    expect(filterFuncties(items, '   ')).toHaveLength(4)
  })

  it('filters by substring', () => {
    const result = filterFuncties(items, 'Product')
    expect(result.map(i => i.titel)).toContain('Product Owner')
    expect(result.map(i => i.titel)).toContain('Sr Product Owner')
    expect(result.map(i => i.titel)).not.toContain('Informatiemanager')
  })

  it('ranks prefix matches above substring matches', () => {
    const result = filterFuncties(items, 'Product')
    expect(result[0].titel).toBe('Product Owner')
    expect(result[1].titel).toBe('Sr Product Owner')
  })

  it('matches via fuzzy characters in order', () => {
    const result = filterFuncties(items, 'PO')
    expect(result.map(i => i.titel)).toContain('Product Owner')
  })

  it('finds "Niet beschikbaar" by fuzzy "NB"', () => {
    const result = filterFuncties(items, 'NB')
    expect(result.map(i => i.titel)).toContain('Niet beschikbaar')
  })

  it('returns empty array when nothing matches', () => {
    expect(filterFuncties(items, 'xyz')).toHaveLength(0)
  })
})
