import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`) }),
}))

const mockUpdateValues = vi.fn()
const mockDeleteWhere = vi.fn()

function makeUpdateChain() {
  const c: Record<string, unknown> = {}
  c.set = vi.fn((...args: unknown[]) => {
    mockUpdateValues(...args)
    return c
  })
  c.where = vi.fn(() => Promise.resolve([]))
  return c
}

function makeDeleteChain() {
  const c: Record<string, unknown> = {}
  c.where = vi.fn((...args: unknown[]) => {
    mockDeleteWhere(...args)
    return Promise.resolve([])
  })
  return c
}

vi.mock('@/lib/db', () => ({
  db: {
    update: vi.fn(() => makeUpdateChain()),
    delete: vi.fn(() => makeDeleteChain()),
  },
}))
vi.mock('@/lib/db/schema', () => ({ users: {}, sessions: {} }))
vi.mock('drizzle-orm', () => ({ eq: vi.fn() }))
vi.mock('@/lib/api', () => ({
  requireAuth: vi.fn(() => Promise.resolve({ user: { id: 'admin-id', role: 'admin' } })),
}))
vi.mock('@/lib/auth/password', () => ({
  hashPassword: vi.fn(() => Promise.resolve('new-hashed-pw')),
}))

import { updateUser } from '@/app/beheer/gebruikers/[id]/actions'

describe('updateUser — admin password reset', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sets mustChangePassword=true when admin provides a new password', async () => {
    const fd = new FormData()
    fd.set('name', 'Test')
    fd.set('role', 'viewer')
    fd.set('isEnabled', 'true')
    fd.set('newPassword', 'nieuwwachtwoord123')

    try { await updateUser('target-user-id', undefined, fd) } catch { /* redirect */ }

    expect(mockUpdateValues).toHaveBeenCalledWith(
      expect.objectContaining({ mustChangePassword: true })
    )
  })

  it('does not set mustChangePassword when no new password is provided', async () => {
    const fd = new FormData()
    fd.set('name', 'Test')
    fd.set('role', 'viewer')
    fd.set('isEnabled', 'true')

    try { await updateUser('target-user-id', undefined, fd) } catch { /* redirect */ }

    expect(mockUpdateValues).toHaveBeenCalledWith(
      expect.not.objectContaining({ mustChangePassword: true })
    )
  })

  it('deletes existing sessions for the target user when password is reset', async () => {
    const { db } = await import('@/lib/db')
    const fd = new FormData()
    fd.set('name', 'Test')
    fd.set('role', 'viewer')
    fd.set('isEnabled', 'true')
    fd.set('newPassword', 'nieuwwachtwoord123')

    try { await updateUser('target-user-id', undefined, fd) } catch { /* redirect */ }

    expect(vi.mocked(db.delete)).toHaveBeenCalled()
    expect(mockDeleteWhere).toHaveBeenCalled()
  })

  it('does not delete sessions when no new password is provided', async () => {
    const { db } = await import('@/lib/db')
    const fd = new FormData()
    fd.set('name', 'Test')
    fd.set('role', 'viewer')
    fd.set('isEnabled', 'true')

    try { await updateUser('target-user-id', undefined, fd) } catch { /* redirect */ }

    expect(vi.mocked(db.delete)).not.toHaveBeenCalled()
  })
})
