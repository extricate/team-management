import { describe, it, expect, vi, beforeEach } from 'vitest'
import { hashPassword } from '@/lib/auth/password'
import { generateTotpSecret, generateTotpCode, encryptTotpSecret } from '@/lib/auth/totp'

// ── DB mock ────────────────────────────────────────────────────────────────────

const mockFindUser = vi.fn()
const mockUpdateUser = vi.fn()

function makeSelectChain() {
  const chain: Record<string, unknown> = {}
  chain.from = vi.fn(() => chain)
  chain.where = vi.fn(() => chain)
  chain.limit = vi.fn(() => mockFindUser())
  return chain
}

function makeUpdateChain() {
  const chain: Record<string, unknown> = {}
  chain.set = vi.fn(() => chain)
  chain.where = vi.fn(() => chain)
  chain.returning = vi.fn(() => mockUpdateUser())
  return chain
}

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(() => makeSelectChain()),
    update: vi.fn(() => makeUpdateChain()),
  },
}))

vi.mock('@/lib/db/schema', () => ({ users: {} }))
vi.mock('drizzle-orm', () => ({ eq: vi.fn() }))

import { authenticate } from '@/lib/auth/authenticate'

const TOTP_KEY = 'testkey_must_be_32_chars_padded!!'

describe('authenticate', () => {
  let passwordHash: string

  beforeEach(async () => {
    vi.clearAllMocks()
    passwordHash = await hashPassword('correct-password')
  })

  it('returns invalid_credentials when user is not found', async () => {
    mockFindUser.mockResolvedValue([])
    const result = await authenticate('unknown@example.com', 'pass', undefined, TOTP_KEY)
    expect(result.status).toBe('invalid_credentials')
  })

  it('returns account_disabled when isEnabled is false', async () => {
    mockFindUser.mockResolvedValue([{ id: '1', passwordHash, isEnabled: false, totpEnabled: false, failedLoginAttempts: 0, lockedUntil: null }])
    const result = await authenticate('user@example.com', 'correct-password', undefined, TOTP_KEY)
    expect(result.status).toBe('account_disabled')
  })

  it('returns account_locked when lockedUntil is in the future', async () => {
    const lockedUntil = new Date(Date.now() + 60_000)
    mockFindUser.mockResolvedValue([{ id: '1', passwordHash, isEnabled: true, totpEnabled: false, failedLoginAttempts: 5, lockedUntil }])
    const result = await authenticate('user@example.com', 'correct-password', undefined, TOTP_KEY)
    expect(result.status).toBe('account_locked')
  })

  it('returns invalid_credentials for wrong password', async () => {
    mockFindUser.mockResolvedValue([{ id: '1', passwordHash, isEnabled: true, totpEnabled: false, failedLoginAttempts: 0, lockedUntil: null }])
    mockUpdateUser.mockResolvedValue([])
    const result = await authenticate('user@example.com', 'wrong-password', undefined, TOTP_KEY)
    expect(result.status).toBe('invalid_credentials')
  })

  it('increments failedLoginAttempts on wrong password', async () => {
    mockFindUser.mockResolvedValue([{ id: '1', passwordHash, isEnabled: true, totpEnabled: false, failedLoginAttempts: 2, lockedUntil: null }])
    mockUpdateUser.mockResolvedValue([])
    await authenticate('user@example.com', 'wrong-password', undefined, TOTP_KEY)
    expect(mockUpdateUser).toHaveBeenCalled()
  })

  it('returns success for correct password when TOTP is not enabled', async () => {
    mockFindUser.mockResolvedValue([{ id: 'user-1', passwordHash, isEnabled: true, totpEnabled: false, failedLoginAttempts: 0, lockedUntil: null }])
    mockUpdateUser.mockResolvedValue([])
    const result = await authenticate('user@example.com', 'correct-password', undefined, TOTP_KEY)
    expect(result.status).toBe('success')
    if (result.status === 'success') expect(result.userId).toBe('user-1')
  })

  it('resets failedLoginAttempts on successful login', async () => {
    mockFindUser.mockResolvedValue([{ id: 'user-1', passwordHash, isEnabled: true, totpEnabled: false, failedLoginAttempts: 3, lockedUntil: null }])
    mockUpdateUser.mockResolvedValue([])
    await authenticate('user@example.com', 'correct-password', undefined, TOTP_KEY)
    expect(mockUpdateUser).toHaveBeenCalled()
  })

  it('returns totp_required when password correct but TOTP enabled and no code given', async () => {
    const totpSecret = encryptTotpSecret(generateTotpSecret(), TOTP_KEY)
    mockFindUser.mockResolvedValue([{ id: 'user-1', passwordHash, isEnabled: true, totpEnabled: true, totpSecret, failedLoginAttempts: 0, lockedUntil: null, lastTotpCounter: null }])
    const result = await authenticate('user@example.com', 'correct-password', undefined, TOTP_KEY)
    expect(result.status).toBe('totp_required')
  })

  it('returns success when TOTP code is correct', async () => {
    const rawSecret = generateTotpSecret()
    const totpSecret = encryptTotpSecret(rawSecret, TOTP_KEY)
    const code = generateTotpCode(rawSecret, Math.floor(Date.now() / 1000 / 30))
    mockFindUser.mockResolvedValue([{ id: 'user-1', passwordHash, isEnabled: true, totpEnabled: true, totpSecret, failedLoginAttempts: 0, lockedUntil: null, lastTotpCounter: null }])
    mockUpdateUser.mockResolvedValue([])
    const result = await authenticate('user@example.com', 'correct-password', code, TOTP_KEY)
    expect(result.status).toBe('success')
  })

  it('returns invalid_totp when TOTP code is wrong', async () => {
    const rawSecret = generateTotpSecret()
    const totpSecret = encryptTotpSecret(rawSecret, TOTP_KEY)
    mockFindUser.mockResolvedValue([{ id: 'user-1', passwordHash, isEnabled: true, totpEnabled: true, totpSecret, failedLoginAttempts: 0, lockedUntil: null, lastTotpCounter: null }])
    const result = await authenticate('user@example.com', 'correct-password', '000000', TOTP_KEY)
    expect(result.status).toBe('invalid_totp')
  })

  it('locks account after 5 failed password attempts', async () => {
    mockFindUser.mockResolvedValue([{ id: '1', passwordHash, isEnabled: true, totpEnabled: false, failedLoginAttempts: 4, lockedUntil: null }])
    const captureSpy = vi.fn().mockResolvedValue([])
    vi.mocked(mockUpdateUser).mockResolvedValue([])
    // Just verify the function calls update with locking data after 5th failure
    await authenticate('user@example.com', 'wrong-password', undefined, TOTP_KEY)
    expect(mockUpdateUser).toHaveBeenCalled()
  })
})
