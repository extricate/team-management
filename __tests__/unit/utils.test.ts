import { describe, it, expect } from 'vitest'
import { formatCurrency, formatCompactCurrency, formatDate, formatFullName, getInitials } from '@/lib/utils'

describe('formatCurrency', () => {
  it('formats a positive integer as Dutch EUR', () => {
    expect(formatCurrency(100000)).toMatch(/100.000/)
  })

  it('formats a decimal number correctly', () => {
    expect(formatCurrency(1234.56)).toMatch(/1.234,56/)
  })

  it('formats a string input', () => {
    expect(formatCurrency('50000')).toMatch(/50.000/)
  })

  it('returns em-dash for null', () => {
    expect(formatCurrency(null)).toBe('—')
  })

  it('returns em-dash for undefined', () => {
    expect(formatCurrency(undefined)).toBe('—')
  })
})

describe('formatCompactCurrency', () => {
  it('returns em-dash for null', () => {
    expect(formatCompactCurrency(null)).toBe('—')
  })

  it('returns em-dash for undefined', () => {
    expect(formatCompactCurrency(undefined)).toBe('—')
  })

  it('returns full format for amounts below €100k', () => {
    const result = formatCompactCurrency(85000)
    expect(result).toMatch(/85.000/)
    expect(result).not.toMatch(/k|M/)
  })

  it('abbreviates amounts >= €100k with "k"', () => {
    expect(formatCompactCurrency(100000)).toMatch(/100k/)
    expect(formatCompactCurrency(850000)).toMatch(/850k/)
  })

  it('abbreviates amounts >= €1M with "M"', () => {
    const result = formatCompactCurrency(1000000)
    expect(result).toMatch(/M/)
    expect(result).toMatch(/1/)
  })

  it('rounds €2,873,462 to two decimal millions', () => {
    const result = formatCompactCurrency(2873462)
    expect(result).toMatch(/M/)
    expect(result).toMatch(/2/)
  })

  it('uses one decimal for amounts >= €10M', () => {
    const result = formatCompactCurrency(12500000)
    expect(result).toMatch(/M/)
    // 12.5M — one decimal place
    expect(result).toMatch(/12/)
  })

  it('handles zero', () => {
    const result = formatCompactCurrency(0)
    // Zero is below 100k threshold, returns full format
    expect(result).toContain('0')
  })

  it('handles negative values', () => {
    const result = formatCompactCurrency(-500000)
    expect(result).toMatch(/k/)
  })
})

describe('formatDate', () => {
  it('formats a Date object in Dutch locale', () => {
    const result = formatDate(new Date('2025-01-15'))
    expect(result).toMatch(/15/)
    expect(result).toMatch(/2025/)
  })

  it('formats an ISO string', () => {
    const result = formatDate('2026-06-01T00:00:00.000Z')
    expect(result).toMatch(/2026/)
  })

  it('returns em-dash for null', () => {
    expect(formatDate(null)).toBe('—')
  })

  it('returns em-dash for undefined', () => {
    expect(formatDate(undefined)).toBe('—')
  })
})

describe('getInitials', () => {
  it('returns first and last initial for a two-word name', () => {
    expect(getInitials('Jan Jansen')).toBe('JJ')
  })

  it('uses the first and last word only for longer names', () => {
    expect(getInitials('Jan van der Berg')).toBe('JB')
  })

  it('returns a single initial for a one-word name', () => {
    expect(getInitials('Jan')).toBe('J')
  })

  it('uppercases lowercase letters', () => {
    expect(getInitials('jan jansen')).toBe('JJ')
  })

  it('returns ? for an empty string', () => {
    expect(getInitials('')).toBe('?')
  })

  it('returns ? for a whitespace-only string', () => {
    expect(getInitials('   ')).toBe('?')
  })

  it('handles an email address as a single token (uses first character)', () => {
    expect(getInitials('jan@voorbeeld.nl')).toBe('J')
  })
})

describe('formatFullName', () => {
  it('joins first and last name when no prefix', () => {
    expect(formatFullName({ firstName: 'Jan', lastName: 'Jansen' })).toBe('Jan Jansen')
  })

  it('includes prefix name when present', () => {
    expect(formatFullName({ firstName: 'Jan', prefixName: 'van der', lastName: 'Berg' })).toBe('Jan van der Berg')
  })

  it('omits prefix when null', () => {
    expect(formatFullName({ firstName: 'Jan', prefixName: null, lastName: 'Pietersen' })).toBe('Jan Pietersen')
  })
})
