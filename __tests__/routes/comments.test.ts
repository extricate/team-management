import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeRequest } from '../helpers/request'

const { db, dbMock } = vi.hoisted(() => {
  const q: unknown[] = []
  const val = () => (q.length > 1 ? q.shift() : q.length === 1 ? q[0] : [])
  const p = (): unknown =>
    new Proxy(function () {}, {
      get(_, k: string | symbol) {
        if (typeof k === 'symbol') return undefined
        if (k === 'then') return (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
          Promise.resolve(val()).then(res, rej)
        if (k === 'catch') return (fn: (e: unknown) => unknown) => Promise.resolve(val()).catch(fn)
        if (k === 'finally') return (fn: () => void) => Promise.resolve(val()).finally(fn)
        return p()
      },
      apply: () => p(),
    })
  return {
    db: p(),
    dbMock: {
      set: (...d: unknown[]) => { q.length = 0; q.push(...d) },
      reset: () => { q.length = 0 },
    },
  }
})

vi.mock('@/lib/db', () => ({ db }))
vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: 'user-mock', email: 'test@example.com', role: 'admin' } }),
}))

import { GET, POST } from '@/app/api/comments/route'
import { auth } from '@/lib/auth'

const TEAM_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const COMMENT = {
  id: 'comment-1',
  body: 'Great progress on this team!',
  commentableType: 'team',
  commentableId: TEAM_ID,
  createdBy: 'user-mock',
  createdAt: new Date(),
  updatedAt: new Date(),
}

beforeEach(() => dbMock.reset())

// --- GET /api/comments ---
// Uses db.query.comments.findMany() filtered by type + id query params

describe('GET /api/comments', () => {
  it('returns empty array when type and id query params are missing', async () => {
    const res = await GET(makeRequest('/api/comments'))
    expect(res.status).toBe(200)
    expect((await res.json()).data).toEqual([])
  })

  it('returns empty array when only type is provided', async () => {
    const res = await GET(makeRequest('/api/comments', { searchParams: { type: 'team' } }))
    expect(res.status).toBe(200)
    expect((await res.json()).data).toEqual([])
  })

  it('returns comments matching the given type and id', async () => {
    dbMock.set([COMMENT])
    const res = await GET(
      makeRequest('/api/comments', { searchParams: { type: 'team', id: TEAM_ID } })
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].body).toBe('Great progress on this team!')
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null)
    expect((await GET(makeRequest('/api/comments'))).status).toBe(401)
  })
})

// --- POST /api/comments ---
// Polymorphic: commentableType can be team, employee, position, financialSource, fundingAllocation

describe('POST /api/comments', () => {
  it('creates a comment on a team and returns 201', async () => {
    dbMock.set([COMMENT])
    const req = makeRequest('/api/comments', {
      method: 'POST',
      body: {
        body: 'Great progress!',
        commentableType: 'team',
        commentableId: TEAM_ID,
      },
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    expect((await res.json()).data.body).toBe('Great progress on this team!')
  })

  it('creates a comment on a financial source', async () => {
    const fsComment = { ...COMMENT, commentableType: 'financialSource' }
    dbMock.set([fsComment])
    const req = makeRequest('/api/comments', {
      method: 'POST',
      body: {
        body: 'Budget approved',
        commentableType: 'financialSource',
        commentableId: TEAM_ID,
      },
    })
    expect((await POST(req)).status).toBe(201)
  })

  it('returns 400 when body is empty', async () => {
    const req = makeRequest('/api/comments', {
      method: 'POST',
      body: { body: '', commentableType: 'team', commentableId: TEAM_ID },
    })
    expect((await POST(req)).status).toBe(400)
  })

  it('returns 400 for an invalid commentableType', async () => {
    const req = makeRequest('/api/comments', {
      method: 'POST',
      body: { body: 'Note', commentableType: 'invalidEntity', commentableId: TEAM_ID },
    })
    expect((await POST(req)).status).toBe(400)
  })

  it('returns 400 when commentableId is not a valid UUID', async () => {
    const req = makeRequest('/api/comments', {
      method: 'POST',
      body: { body: 'Note', commentableType: 'team', commentableId: 'not-a-uuid' },
    })
    expect((await POST(req)).status).toBe(400)
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null)
    const req = makeRequest('/api/comments', {
      method: 'POST',
      body: { body: 'Note', commentableType: 'team', commentableId: TEAM_ID },
    })
    expect((await POST(req)).status).toBe(401)
  })
})
