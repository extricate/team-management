import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock next/navigation (redirect throws in test env) ─────────────────────────
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`) }),
}))

// ── Mock next/headers (cookies) ────────────────────────────────────────────────
const mockCookieDelete = vi.fn()
const mockCookieSet = vi.fn()
const mockCookieJar = { delete: mockCookieDelete, set: mockCookieSet }
vi.mock('next/headers', () => ({ cookies: vi.fn(() => Promise.resolve(mockCookieJar)) }))

// ── Mock DB ────────────────────────────────────────────────────────────────────
const mockFindUser = vi.fn()
const mockUpdateUser = vi.fn()
const mockInsertAudit = vi.fn()

function makeSelectChain() {
  const c: Record<string, unknown> = {}
  c.from = vi.fn(() => c)
  c.where = vi.fn(() => c)
  c.limit = vi.fn(() => mockFindUser())
  return c
}

function makeUpdateChain() {
  const c: Record<string, unknown> = {}
  c.set = vi.fn(() => c)
  c.where = vi.fn(() => mockUpdateUser())
  return c
}

function makeInsertChain() {
  const c: Record<string, unknown> = {}
  c.values = vi.fn(() => mockInsertAudit())
  return c
}

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(() => makeSelectChain()),
    update: vi.fn(() => makeUpdateChain()),
    insert: vi.fn(() => makeInsertChain()),
  },
}))
vi.mock('@/lib/db/schema', () => ({ users: {}, auditEvents: {} }))
vi.mock('drizzle-orm', () => ({ eq: vi.fn() }))
vi.mock('@/proxy', () => ({ FORCE_CHANGE_COOKIE: 'auth_force_pw_change' }))

// ── Mock requireAuth ───────────────────────────────────────────────────────────
const mockSession = { user: { id: 'user-123', mustChangePassword: true } }
vi.mock('@/lib/api', () => ({ requireAuth: vi.fn(() => Promise.resolve(mockSession)) }))

// ── Module under test ──────────────────────────────────────────────────────────
import { changePassword } from '@/app/wachtwoord-wijzigen/actions'

describe('changePassword', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateUser.mockResolvedValue([])
    mockInsertAudit.mockResolvedValue([])
  })

  it('returns error when password is shorter than 12 chars', async () => {
    const fd = new FormData()
    fd.set('password', 'short')
    fd.set('confirmPassword', 'short')
    const result = await changePassword(undefined, fd)
    expect(result?.error).toMatch(/12 tekens/)
  })

  it('returns error when passwords do not match', async () => {
    const fd = new FormData()
    fd.set('password', 'langwachtwoord123')
    fd.set('confirmPassword', 'anderwachtwoord456')
    const result = await changePassword(undefined, fd)
    expect(result?.error).toMatch(/komen niet overeen/)
  })

  it('returns error when user does not have mustChangePassword set', async () => {
    const { requireAuth } = await import('@/lib/api')
    vi.mocked(requireAuth).mockResolvedValueOnce({ user: { id: 'user-123', mustChangePassword: false } } as any)
    const fd = new FormData()
    fd.set('password', 'geldigwachtwoord123')
    fd.set('confirmPassword', 'geldigwachtwoord123')
    const result = await changePassword(undefined, fd)
    expect(result?.error).toBeTruthy()
  })

  it('updates passwordHash and clears mustChangePassword on success', async () => {
    const { db } = await import('@/lib/db')
    const fd = new FormData()
    fd.set('password', 'geldigwachtwoord123')
    fd.set('confirmPassword', 'geldigwachtwoord123')
    try { await changePassword(undefined, fd) } catch { /* redirect throws */ }
    expect(vi.mocked(db.update)).toHaveBeenCalled()
    expect(mockUpdateUser).toHaveBeenCalled()
  })

  it('writes an audit event on success', async () => {
    const { db } = await import('@/lib/db')
    const fd = new FormData()
    fd.set('password', 'geldigwachtwoord123')
    fd.set('confirmPassword', 'geldigwachtwoord123')
    try { await changePassword(undefined, fd) } catch { /* redirect throws */ }
    expect(vi.mocked(db.insert)).toHaveBeenCalled()
    expect(mockInsertAudit).toHaveBeenCalled()
  })

  it('clears the auth_force_pw_change cookie on success', async () => {
    const fd = new FormData()
    fd.set('password', 'geldigwachtwoord123')
    fd.set('confirmPassword', 'geldigwachtwoord123')
    try { await changePassword(undefined, fd) } catch { /* redirect throws */ }
    expect(mockCookieDelete).toHaveBeenCalledWith('auth_force_pw_change')
  })

  it('redirects to callbackUrl after success', async () => {
    const fd = new FormData()
    fd.set('password', 'geldigwachtwoord123')
    fd.set('confirmPassword', 'geldigwachtwoord123')
    fd.set('callbackUrl', '/teams')
    try { await changePassword(undefined, fd) } catch (e) {
      expect((e as Error).message).toBe('REDIRECT:/teams')
    }
  })

  it('redirects to /dashboard when no callbackUrl provided', async () => {
    const fd = new FormData()
    fd.set('password', 'geldigwachtwoord123')
    fd.set('confirmPassword', 'geldigwachtwoord123')
    try { await changePassword(undefined, fd) } catch (e) {
      expect((e as Error).message).toBe('REDIRECT:/dashboard')
    }
  })
})
