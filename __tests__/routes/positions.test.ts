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

import { GET, POST } from '@/app/api/positions/route'
import { GET as GetById, PATCH, DELETE } from '@/app/api/positions/[id]/route'
import { auth } from '@/lib/auth'

const TEAM_ID = 'b1b2c3d4-0000-0000-0000-000000000001'
const POSITION = {
  id: 'pos-1',
  teamId: TEAM_ID,
  type: 'Product Owner',
  opfType: null,
  positionCode: 'P001',
  status: 'planned',
  expectedStart: null,
  expectedEnd: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

beforeEach(() => dbMock.reset())

// --- GET /api/positions ---
// Uses db.query.positions.findMany() → array

describe('GET /api/positions', () => {
  it('returns 200 with positions list', async () => {
    dbMock.set([POSITION])
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].type).toBe('Product Owner')
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never)
    expect((await GET()).status).toBe(401)
  })
})

// --- POST /api/positions ---

describe('POST /api/positions', () => {
  it('creates a position with valid data and returns 201', async () => {
    dbMock.set([POSITION])
    const req = makeRequest('/api/positions', {
      method: 'POST',
      body: { teamId: TEAM_ID, type: 'Product Owner', status: 'planned' },
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    expect((await res.json()).data.type).toBe('Product Owner')
  })

  it('creates a position with opfType and returns it in the response', async () => {
    dbMock.set([{ ...POSITION, opfType: 'OPF1' }])
    const req = makeRequest('/api/positions', {
      method: 'POST',
      body: { teamId: TEAM_ID, type: 'Product Owner', status: 'planned', opfType: 'OPF1' },
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    expect((await res.json()).data.opfType).toBe('OPF1')
  })

  it('creates a position without opfType (opfType is optional)', async () => {
    dbMock.set([POSITION])
    const req = makeRequest('/api/positions', {
      method: 'POST',
      body: { teamId: TEAM_ID, type: 'Scrum Master', status: 'open' },
    })
    expect((await POST(req)).status).toBe(201)
  })

  it('returns 400 when teamId is missing', async () => {
    const req = makeRequest('/api/positions', {
      method: 'POST',
      body: { type: 'Product Owner' },
    })
    expect((await POST(req)).status).toBe(400)
  })

  it('returns 400 for an invalid status value', async () => {
    const req = makeRequest('/api/positions', {
      method: 'POST',
      body: { teamId: TEAM_ID, type: 'Product Owner', status: 'invalid_status' },
    })
    expect((await POST(req)).status).toBe(400)
  })

  it('accepts optional start and end dates', async () => {
    dbMock.set([{ ...POSITION, expectedStart: new Date('2025-01-01'), expectedEnd: new Date('2026-01-01') }])
    const req = makeRequest('/api/positions', {
      method: 'POST',
      body: {
        teamId: TEAM_ID,
        type: 'Scrum Master',
        status: 'open',
        expectedStart: '2025-01-01T00:00:00.000Z',
        expectedEnd: '2026-01-01T00:00:00.000Z',
      },
    })
    expect((await POST(req)).status).toBe(201)
  })
})

// --- GET /api/positions/[id] ---
// Uses db.query.positions.findFirst() → single object

describe('GET /api/positions/[id]', () => {
  it('returns 200 with position details', async () => {
    dbMock.set(POSITION)
    const res = await GetById(makeRequest('/api/positions/pos-1'), { params: Promise.resolve({ id: 'pos-1' }) })
    expect(res.status).toBe(200)
    expect((await res.json()).data.id).toBe('pos-1')
  })

  it('returns 404 for unknown position', async () => {
    dbMock.set(undefined)
    expect((await GetById(makeRequest('/api/positions/missing'), { params: Promise.resolve({ id: 'missing' }) })).status).toBe(404)
  })

  it('returns 404 for a soft-deleted position', async () => {
    dbMock.set({ ...POSITION, deletedAt: new Date() })
    expect((await GetById(makeRequest('/api/positions/pos-1'), { params: Promise.resolve({ id: 'pos-1' }) })).status).toBe(404)
  })
})

// --- PATCH /api/positions/[id] ---
// Route: select (before) → update.returning (after)

describe('PATCH /api/positions/[id]', () => {
  it('updates position status and returns 200', async () => {
    const updated = { ...POSITION, status: 'filled' }
    dbMock.set([POSITION], [updated])
    const req = makeRequest('/api/positions/pos-1', { method: 'PATCH', body: { status: 'filled' } })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'pos-1' }) })
    expect(res.status).toBe(200)
    expect((await res.json()).data.status).toBe('filled')
  })

  it('sets opfType and returns it in the response', async () => {
    const updated = { ...POSITION, opfType: 'OPF9-inhuur' }
    dbMock.set([POSITION], [updated])
    const req = makeRequest('/api/positions/pos-1', { method: 'PATCH', body: { opfType: 'OPF9-inhuur' } })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'pos-1' }) })
    expect(res.status).toBe(200)
    expect((await res.json()).data.opfType).toBe('OPF9-inhuur')
  })

  it('clears opfType when set to null', async () => {
    const withOpf = { ...POSITION, opfType: 'OPF1' }
    const cleared = { ...POSITION, opfType: null }
    dbMock.set([withOpf], [cleared])
    const req = makeRequest('/api/positions/pos-1', { method: 'PATCH', body: { opfType: null } })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'pos-1' }) })
    expect(res.status).toBe(200)
    expect((await res.json()).data.opfType).toBeNull()
  })

  it('returns 404 when position does not exist', async () => {
    dbMock.set([])
    const req = makeRequest('/api/positions/missing', { method: 'PATCH', body: { status: 'open' } })
    expect((await PATCH(req, { params: Promise.resolve({ id: 'missing' }) })).status).toBe(404)
  })

  it('returns 400 for an invalid status value', async () => {
    dbMock.set([POSITION])
    const req = makeRequest('/api/positions/pos-1', { method: 'PATCH', body: { status: 'invalid' } })
    expect((await PATCH(req, { params: Promise.resolve({ id: 'pos-1' }) })).status).toBe(400)
  })
})

// --- DELETE /api/positions/[id] ---
// Route: select (before) → update (no returning)

describe('DELETE /api/positions/[id]', () => {
  it('soft-deletes the position and returns 200', async () => {
    dbMock.set([POSITION])
    const res = await DELETE(makeRequest('/api/positions/pos-1'), { params: Promise.resolve({ id: 'pos-1' }) })
    expect(res.status).toBe(200)
    expect((await res.json()).data.message).toBe('Gearchiveerd')
  })

  it('returns 404 when position does not exist', async () => {
    dbMock.set([])
    expect((await DELETE(makeRequest('/api/positions/missing'), { params: Promise.resolve({ id: 'missing' }) })).status).toBe(404)
  })
})
