import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`) }),
}))

const mockInsertValues = vi.fn()
const mockSelectChainResult = vi.fn()

function makeInsertChain() {
  const c: Record<string, unknown> = {}
  c.values = vi.fn((...args: unknown[]) => {
    mockInsertValues(...args)
    return Promise.resolve([{ id: 'new-user-id' }])
  })
  return c
}

function makeSelectChain() {
  const c: Record<string, unknown> = {}
  c.from = vi.fn(() => c)
  c.where = vi.fn(() => mockSelectChainResult())
  return c
}

vi.mock('@/lib/db', () => ({
  db: {
    insert: vi.fn(() => makeInsertChain()),
    select: vi.fn(() => makeSelectChain()),
  },
}))
vi.mock('@/lib/db/schema', () => ({ users: {} }))
vi.mock('drizzle-orm', () => ({ eq: vi.fn() }))
vi.mock('@/lib/api', () => ({
  requireAuth: vi.fn(() => Promise.resolve({ user: { id: 'admin-id', role: 'admin' } })),
}))
vi.mock('@/lib/auth/password', () => ({
  hashPassword: vi.fn(() => Promise.resolve('hashed-pw')),
}))

import { createUser } from '@/app/beheer/gebruikers/nieuw/actions'

describe('createUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSelectChainResult.mockResolvedValue([]) // no existing user
  })

  it('sets mustChangePassword=true when creating a new user', async () => {
    const fd = new FormData()
    fd.set('name', 'Testgebruiker')
    fd.set('email', 'nieuw@example.com')
    fd.set('password', 'veiligwachtwoord123')
    fd.set('role', 'viewer')

    try { await createUser(undefined, fd) } catch { /* redirect */ }

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ mustChangePassword: true })
    )
  })
})
