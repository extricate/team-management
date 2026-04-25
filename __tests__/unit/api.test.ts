import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: 'user-1', email: 'test@example.com', role: 'admin' },
  }),
}))

import {
  ok,
  created,
  err,
  notFound,
  unauthorized,
  forbidden,
  badRequest,
  serverError,
  AuthError,
  withErrorHandling,
  requireAuth,
} from '@/lib/api'
import { auth } from '@/lib/auth'

describe('ok', () => {
  it('returns 200 with wrapped data', async () => {
    const res = ok({ id: 1 })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ data: { id: 1 } })
  })

  it('accepts a custom status code', async () => {
    const res = ok({ id: 1 }, 202)
    expect(res.status).toBe(202)
  })
})

describe('created', () => {
  it('returns 201 with wrapped data', async () => {
    const res = created({ id: 2 })
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ data: { id: 2 } })
  })
})

describe('err', () => {
  it('returns the given status with an error body', async () => {
    const res = err('Conflict', 409)
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: 'Conflict' })
  })
})

describe('notFound', () => {
  it('returns 404', () => {
    expect(notFound().status).toBe(404)
  })

  it('uses a custom message when provided', async () => {
    const res = notFound('Position not found')
    expect(await res.json()).toEqual({ error: 'Position not found' })
  })

  it('defaults to "Not found"', async () => {
    expect(await notFound().json()).toEqual({ error: 'Not found' })
  })
})

describe('unauthorized', () => {
  it('returns 401', () => {
    expect(unauthorized().status).toBe(401)
  })
})

describe('forbidden', () => {
  it('returns 403', () => {
    expect(forbidden().status).toBe(403)
  })
})

describe('badRequest', () => {
  it('returns 400 with the error message', async () => {
    const res = badRequest('Invalid type')
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Invalid type' })
  })
})

describe('serverError', () => {
  it('returns 500', () => {
    expect(serverError().status).toBe(500)
  })
})

describe('AuthError', () => {
  it('is an instance of Error', () => {
    const e = new AuthError('Not allowed')
    expect(e).toBeInstanceOf(Error)
    expect(e.name).toBe('AuthError')
    expect(e.message).toBe('Not allowed')
  })
})

describe('withErrorHandling', () => {
  it('passes through the handler result on success', async () => {
    const handler = vi.fn().mockResolvedValue(ok({ ok: true }))
    const res = await withErrorHandling(handler)()
    expect(res.status).toBe(200)
  })

  it('converts AuthError into a 401 response', async () => {
    const handler = vi.fn().mockRejectedValue(new AuthError('Not authenticated'))
    const res = await withErrorHandling(handler)()
    expect(res.status).toBe(401)
  })

  it('converts unexpected errors into a 500 response', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('DB timeout'))
    const res = await withErrorHandling(handler)()
    expect(res.status).toBe(500)
  })
})

describe('requireAuth', () => {
  it('returns the session when the user is authenticated', async () => {
    const session = await requireAuth()
    expect(session.user?.id).toBe('user-1')
  })

  it('throws AuthError when auth() returns null', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null)
    await expect(requireAuth()).rejects.toBeInstanceOf(AuthError)
  })
})
