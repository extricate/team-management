import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeRequest } from '../helpers/request'

// Proxy-based db mock: any Drizzle chain (select/insert/update/query) resolves
// with the value set via dbMock.set(). Multiple calls dequeue in order.
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
      // Each argument becomes the result for one sequential db call
      set: (...d: unknown[]) => { q.length = 0; q.push(...d) },
      reset: () => { q.length = 0 },
    },
  }
})

vi.mock('@/lib/db', () => ({ db }))
vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: 'user-mock', email: 'test@example.com', role: 'admin' } }),
}))
vi.mock('@/lib/audit', () => ({ logAudit: vi.fn().mockResolvedValue(undefined) }))

import { GET, POST } from '@/app/api/organisations/route'
import { GET as GetById, PATCH, DELETE } from '@/app/api/organisations/[id]/route'
import { auth } from '@/lib/auth'

// organisations uses db.select().from().where() — all results are arrays
const ORG = { id: 'org-1', name: 'Test Org', type: 'OS1', deletedAt: null, createdAt: new Date(), updatedAt: new Date() }

beforeEach(() => dbMock.reset())

// --- GET /api/organisations ---

describe('GET /api/organisations', () => {
  it('returns 200 with organisations list', async () => {
    dbMock.set([ORG])
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].id).toBe('org-1')
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })
})

// --- POST /api/organisations ---

describe('POST /api/organisations', () => {
  it('creates an organisation with valid data and returns 201', async () => {
    dbMock.set([ORG])
    const req = makeRequest('/api/organisations', {
      method: 'POST',
      body: { name: 'Test Org', type: 'OS1' },
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.name).toBe('Test Org')
  })

  it('returns 400 for an empty name', async () => {
    const req = makeRequest('/api/organisations', {
      method: 'POST',
      body: { name: '', type: 'OS1' },
    })
    expect((await POST(req)).status).toBe(400)
  })

  it('returns 400 for an invalid type', async () => {
    const req = makeRequest('/api/organisations', {
      method: 'POST',
      body: { name: 'Valid Name', type: 'OS9' },
    })
    expect((await POST(req)).status).toBe(400)
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null)
    const req = makeRequest('/api/organisations', {
      method: 'POST',
      body: { name: 'Test Org', type: 'OS1' },
    })
    expect((await POST(req)).status).toBe(401)
  })
})

// --- GET /api/organisations/[id] ---
// Route uses db.select().from().where() — result is an array, destructured as [row]

describe('GET /api/organisations/[id]', () => {
  it('returns 200 with the organisation when found', async () => {
    dbMock.set([ORG])
    const res = await GetById(makeRequest('/api/organisations/org-1'), { params: { id: 'org-1' } })
    expect(res.status).toBe(200)
    expect((await res.json()).data.id).toBe('org-1')
  })

  it('returns 404 when no organisation exists with that id', async () => {
    dbMock.set([])
    const res = await GetById(makeRequest('/api/organisations/missing'), { params: { id: 'missing' } })
    expect(res.status).toBe(404)
  })

  it('returns 404 for a soft-deleted organisation', async () => {
    dbMock.set([{ ...ORG, deletedAt: new Date() }])
    const res = await GetById(makeRequest('/api/organisations/org-1'), { params: { id: 'org-1' } })
    expect(res.status).toBe(404)
  })
})

// --- PATCH /api/organisations/[id] ---
// Route does: select (before) → update (after) — two sequential db calls

describe('PATCH /api/organisations/[id]', () => {
  it('updates the organisation and returns 200', async () => {
    const updated = { ...ORG, name: 'Updated Org' }
    dbMock.set([ORG], [updated])
    const req = makeRequest('/api/organisations/org-1', {
      method: 'PATCH',
      body: { name: 'Updated Org' },
    })
    const res = await PATCH(req, { params: { id: 'org-1' } })
    expect(res.status).toBe(200)
    expect((await res.json()).data.name).toBe('Updated Org')
  })

  it('returns 404 when the organisation does not exist', async () => {
    dbMock.set([])
    const req = makeRequest('/api/organisations/missing', { method: 'PATCH', body: { name: 'X' } })
    expect((await PATCH(req, { params: { id: 'missing' } })).status).toBe(404)
  })

  it('returns 400 for an invalid type value', async () => {
    dbMock.set([ORG])
    const req = makeRequest('/api/organisations/org-1', { method: 'PATCH', body: { type: 'INVALID' } })
    expect((await PATCH(req, { params: { id: 'org-1' } })).status).toBe(400)
  })
})

// --- DELETE /api/organisations/[id] ---
// Route does: select (before) → update (soft-delete) — two sequential db calls

describe('DELETE /api/organisations/[id]', () => {
  it('soft-deletes the organisation and returns 200', async () => {
    dbMock.set([ORG], [{ ...ORG, deletedAt: new Date() }])
    const res = await DELETE(makeRequest('/api/organisations/org-1'), { params: { id: 'org-1' } })
    expect(res.status).toBe(200)
    expect((await res.json()).data.message).toBe('Gearchiveerd')
  })

  it('returns 404 when organisation does not exist', async () => {
    dbMock.set([])
    expect((await DELETE(makeRequest('/api/organisations/missing'), { params: { id: 'missing' } })).status).toBe(404)
  })

  it('returns 404 for an already archived organisation', async () => {
    dbMock.set([{ ...ORG, deletedAt: new Date() }])
    expect((await DELETE(makeRequest('/api/organisations/org-1'), { params: { id: 'org-1' } })).status).toBe(404)
  })
})
