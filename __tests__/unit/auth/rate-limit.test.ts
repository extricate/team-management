import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── DB mock ────────────────────────────────────────────────────────────────────

const mockReturning = vi.fn()

function makeInsertChain() {
  const chain: Record<string, unknown> = {}
  chain.values = vi.fn(() => chain)
  chain.onConflictDoUpdate = vi.fn(() => chain)
  chain.returning = vi.fn(() => mockReturning())
  return chain
}

vi.mock('@/lib/db', () => ({
  db: { insert: vi.fn(() => makeInsertChain()) },
}))

vi.mock('@/lib/db/schema', () => ({
  loginRateLimits: {
    key: 'key',
    attempts: 'attempts',
    windowStart: 'window_start',
  },
}))

import { checkLoginRateLimit } from '@/lib/auth/rate-limit'

describe('checkLoginRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns false when attempts are within the limit', async () => {
    mockReturning.mockResolvedValue([{ attempts: 1, windowStart: new Date() }])
    expect(await checkLoginRateLimit('1.2.3.4')).toBe(false)
  })

  it('returns false at exactly the limit (20 attempts)', async () => {
    mockReturning.mockResolvedValue([{ attempts: 20, windowStart: new Date() }])
    expect(await checkLoginRateLimit('1.2.3.4')).toBe(false)
  })

  it('returns true when attempts exceed the limit', async () => {
    mockReturning.mockResolvedValue([{ attempts: 21, windowStart: new Date() }])
    expect(await checkLoginRateLimit('1.2.3.4')).toBe(true)
  })

  it('returns false after window reset (attempts reset to 1)', async () => {
    // Window was old, so DB resets attempts to 1
    mockReturning.mockResolvedValue([{ attempts: 1, windowStart: new Date() }])
    expect(await checkLoginRateLimit('5.6.7.8')).toBe(false)
  })
})
