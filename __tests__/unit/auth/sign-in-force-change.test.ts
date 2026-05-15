import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ──────────────────────────────────────────────────────────────────────
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`) }),
}))

const mockCookieSet = vi.fn()
const mockCookieDelete = vi.fn()
const mockCookieGet = vi.fn()
const mockCookieJar = { set: mockCookieSet, delete: mockCookieDelete, get: mockCookieGet }
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieJar)),
  headers: vi.fn(() => Promise.resolve(new Map([['x-forwarded-for', '127.0.0.1']]))),
}))

vi.mock('@/lib/auth/rate-limit', () => ({
  checkLoginRateLimit: vi.fn(() => Promise.resolve(false)),
}))

vi.mock('@/lib/auth/authenticate', () => ({
  authenticate: vi.fn(),
}))
import * as authenticateModule from '@/lib/auth/authenticate'
const mockAuthenticate = vi.mocked(authenticateModule.authenticate)

const mockDbInsert = vi.fn()
const mockDbSelect = vi.fn()

function makeInsertChain() {
  const c: Record<string, unknown> = {}
  c.values = vi.fn(() => mockDbInsert())
  return c
}

function makeSelectChain(result: unknown[]) {
  const c: Record<string, unknown> = {}
  c.from = vi.fn(() => c)
  c.where = vi.fn(() => c)
  c.limit = vi.fn(() => Promise.resolve(result))
  mockDbSelect.mockReturnValueOnce(c)
  return c
}

vi.mock('@/lib/db', () => ({
  db: {
    insert: vi.fn(() => makeInsertChain()),
    select: vi.fn((...args: unknown[]) => mockDbSelect(...args)),
  },
}))
vi.mock('@/lib/db/schema', () => ({ users: {}, sessions: {} }))
vi.mock('drizzle-orm', () => ({ eq: vi.fn() }))
vi.mock('@/proxy', () => ({ FORCE_CHANGE_COOKIE: 'auth_force_pw_change' }))

import { signInWithPassword } from '@/app/inloggen/actions'

describe('signInWithPassword — mustChangePassword cookie', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDbInsert.mockResolvedValue([])
  })

  it('sets auth_force_pw_change cookie when user has mustChangePassword=true', async () => {
    mockAuthenticate.mockResolvedValue({ status: 'success', userId: 'user-1' })
    makeSelectChain([{ mustChangePassword: true }])

    const fd = new FormData()
    fd.set('email', 'user@example.com')
    fd.set('password', 'geheimwachtwoord')

    try { await signInWithPassword(undefined, fd) } catch { /* redirect */ }

    const setCall = mockCookieSet.mock.calls.find(
      ([name]: [string]) => name === 'auth_force_pw_change'
    )
    expect(setCall).toBeTruthy()
    expect(setCall[1]).toBe('1')
  })

  it('does not set auth_force_pw_change cookie when mustChangePassword=false', async () => {
    mockAuthenticate.mockResolvedValue({ status: 'success', userId: 'user-1' })
    makeSelectChain([{ mustChangePassword: false }])

    const fd = new FormData()
    fd.set('email', 'user@example.com')
    fd.set('password', 'geheimwachtwoord')

    try { await signInWithPassword(undefined, fd) } catch { /* redirect */ }

    const setCall = mockCookieSet.mock.calls.find(
      ([name]: [string]) => name === 'auth_force_pw_change'
    )
    expect(setCall).toBeFalsy()
  })

  it('redirects to /wachtwoord-wijzigen when mustChangePassword=true', async () => {
    mockAuthenticate.mockResolvedValue({ status: 'success', userId: 'user-1' })
    makeSelectChain([{ mustChangePassword: true }])

    const fd = new FormData()
    fd.set('email', 'user@example.com')
    fd.set('password', 'geheimwachtwoord')
    fd.set('callbackUrl', '/teams')

    let redirectUrl = ''
    try { await signInWithPassword(undefined, fd) } catch (e) {
      redirectUrl = (e as Error).message.replace('REDIRECT:', '')
    }
    expect(redirectUrl).toBe('/wachtwoord-wijzigen?callbackUrl=%2Fteams')
  })

  it('redirects to callbackUrl directly when mustChangePassword=false', async () => {
    mockAuthenticate.mockResolvedValue({ status: 'success', userId: 'user-1' })
    makeSelectChain([{ mustChangePassword: false }])

    const fd = new FormData()
    fd.set('email', 'user@example.com')
    fd.set('password', 'geheimwachtwoord')
    fd.set('callbackUrl', '/teams')

    let redirectUrl = ''
    try { await signInWithPassword(undefined, fd) } catch (e) {
      redirectUrl = (e as Error).message.replace('REDIRECT:', '')
    }
    expect(redirectUrl).toBe('/teams')
  })
})
