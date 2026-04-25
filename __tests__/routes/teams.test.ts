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
vi.mock('@/lib/audit', () => ({ logAudit: vi.fn().mockResolvedValue(undefined) }))

import { GET, POST } from '@/app/api/teams/route'
import { GET as GetById, PATCH, DELETE } from '@/app/api/teams/[id]/route'
import { auth } from '@/lib/auth'

const ORG_ID = 'a1b2c3d4-0000-0000-0000-000000000001'
const TEAM = {
  id: 'team-1',
  organisationId: ORG_ID,
  name: 'Engineering',
  description: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

beforeEach(() => dbMock.reset())

// --- GET /api/teams ---
// Uses db.query.teams.findMany() → result is an array

describe('GET /api/teams', () => {
  it('returns 200 with teams list', async () => {
    dbMock.set([TEAM])
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].name).toBe('Engineering')
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null)
    expect((await GET()).status).toBe(401)
  })
})

// --- POST /api/teams ---

describe('POST /api/teams', () => {
  it('creates a team with valid data and returns 201', async () => {
    dbMock.set([TEAM])
    const req = makeRequest('/api/teams', {
      method: 'POST',
      body: { organisationId: ORG_ID, name: 'Engineering' },
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    expect((await res.json()).data.name).toBe('Engineering')
  })

  it('returns 400 when organisationId is missing', async () => {
    const req = makeRequest('/api/teams', { method: 'POST', body: { name: 'Engineering' } })
    expect((await POST(req)).status).toBe(400)
  })

  it('returns 400 when name is empty', async () => {
    const req = makeRequest('/api/teams', { method: 'POST', body: { organisationId: ORG_ID, name: '' } })
    expect((await POST(req)).status).toBe(400)
  })
})

// --- GET /api/teams/[id] ---
// Uses db.query.teams.findFirst() → returns a single object (not an array)

describe('GET /api/teams/[id]', () => {
  it('returns 200 with team details', async () => {
    dbMock.set(TEAM)
    const res = await GetById(makeRequest('/api/teams/team-1'), { params: { id: 'team-1' } })
    expect(res.status).toBe(200)
    expect((await res.json()).data.id).toBe('team-1')
  })

  it('returns 404 for unknown team', async () => {
    dbMock.set(undefined)
    expect((await GetById(makeRequest('/api/teams/missing'), { params: { id: 'missing' } })).status).toBe(404)
  })

  it('returns 404 for a soft-deleted team', async () => {
    dbMock.set({ ...TEAM, deletedAt: new Date() })
    expect((await GetById(makeRequest('/api/teams/team-1'), { params: { id: 'team-1' } })).status).toBe(404)
  })
})

// --- PATCH /api/teams/[id] ---
// Route: select (before) → update.returning (after)

describe('PATCH /api/teams/[id]', () => {
  it('updates team name and returns 200', async () => {
    const updated = { ...TEAM, name: 'Platform' }
    dbMock.set([TEAM], [updated])
    const req = makeRequest('/api/teams/team-1', { method: 'PATCH', body: { name: 'Platform' } })
    const res = await PATCH(req, { params: { id: 'team-1' } })
    expect(res.status).toBe(200)
    expect((await res.json()).data.name).toBe('Platform')
  })

  it('returns 404 when team does not exist', async () => {
    dbMock.set([])
    const req = makeRequest('/api/teams/missing', { method: 'PATCH', body: { name: 'X' } })
    expect((await PATCH(req, { params: { id: 'missing' } })).status).toBe(404)
  })
})

// --- DELETE /api/teams/[id] ---
// Route: select (before) → update (no returning needed)

describe('DELETE /api/teams/[id]', () => {
  it('soft-deletes the team and returns 200', async () => {
    dbMock.set([TEAM])
    const res = await DELETE(makeRequest('/api/teams/team-1'), { params: { id: 'team-1' } })
    expect(res.status).toBe(200)
    expect((await res.json()).data.message).toBe('Gearchiveerd')
  })

  it('returns 404 when team does not exist', async () => {
    dbMock.set([])
    expect((await DELETE(makeRequest('/api/teams/missing'), { params: { id: 'missing' } })).status).toBe(404)
  })
})
