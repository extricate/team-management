import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── DB mock ────────────────────────────────────────────────────────────────────

const mockFindUser = vi.fn()
const mockInsertValues = vi.fn()

function makeSelectChain() {
  const chain: Record<string, unknown> = {}
  chain.from = vi.fn(() => chain)
  chain.where = vi.fn(() => chain)
  chain.limit = vi.fn(() => mockFindUser())
  return chain
}

function makeInsertChain() {
  const chain: Record<string, unknown> = {}
  chain.values = vi.fn((vals: unknown) => {
    mockInsertValues(vals)
    return Promise.resolve([])
  })
  return chain
}

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(() => makeSelectChain()),
    insert: vi.fn(() => makeInsertChain()),
  },
}))

vi.mock('@/lib/db/schema', () => ({ users: {}, bestellingTypes: {} }))
vi.mock('drizzle-orm', () => ({ eq: vi.fn() }))

import { createAdminUser } from '@/lib/db/seed'

describe('createAdminUser', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates user with a hashed password when user does not exist', async () => {
    mockFindUser.mockResolvedValue([])

    const result = await createAdminUser('admin@example.com', 'Admin User', () => 'test-password-123')

    expect(result).toEqual({ created: true, password: 'test-password-123' })
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin',
        passwordHash: expect.any(String),
      })
    )
  })

  it('stores a hash of the generated password, not the plaintext', async () => {
    mockFindUser.mockResolvedValue([])

    await createAdminUser('admin@example.com', 'Admin', () => 'plaintext-secret')

    const inserted = mockInsertValues.mock.calls[0][0]
    expect(inserted.passwordHash).not.toBe('plaintext-secret')
    expect(inserted.passwordHash).toContain(':')
  })

  it('returns created: false when admin user already exists', async () => {
    mockFindUser.mockResolvedValue([{ id: '1', email: 'admin@example.com' }])

    const result = await createAdminUser('admin@example.com', 'Admin', () => 'test-password')

    expect(result).toEqual({ created: false })
    expect(mockInsertValues).not.toHaveBeenCalled()
  })
})
