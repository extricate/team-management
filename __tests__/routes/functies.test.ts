import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeRequest } from '../helpers/request'

type DbMockGlobal = { createDbMock: () => { db: unknown; dbMock: { set: (...d: unknown[]) => void; reset: () => void } } }
const { db, dbMock } = vi.hoisted(() => (globalThis as unknown as DbMockGlobal).createDbMock())

vi.mock('@/lib/db', () => ({ db }))
vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: 'user-mock', email: 'test@example.com', role: 'admin' } }),
}))
vi.mock('@/lib/audit', () => ({ logAudit: vi.fn().mockResolvedValue(undefined) }))

import { GET, POST } from '@/app/api/functies/route'
import { GET as GetById, PATCH, DELETE } from '@/app/api/functies/[id]/route'
import { auth } from '@/lib/auth'

const NIET_BESCHIKBAAR_TITEL = 'Niet beschikbaar'

const FUNCTIE = {
  id: 'functie-1',
  titel: 'Product Owner',
  schaalCode: '12',
  isActive: true,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const SENTINEL = { ...FUNCTIE, id: 'sentinel-1', titel: NIET_BESCHIKBAAR_TITEL }

beforeEach(() => dbMock.reset())

// --- GET /api/functies ---
// getAllFuncties / getActiveFuncties: single db.select chain

describe('GET /api/functies', () => {
  it('returns 200 with functies list', async () => {
    dbMock.set([FUNCTIE])
    const res = await GET(makeRequest('/api/functies'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].titel).toBe('Product Owner')
  })

  it('returns only active functies when ?active=true', async () => {
    dbMock.set([FUNCTIE])
    const res = await GET(makeRequest('/api/functies', { searchParams: { active: 'true' } }))
    expect(res.status).toBe(200)
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never)
    expect((await GET(makeRequest('/api/functies'))).status).toBe(401)
  })
})

// --- POST /api/functies ---
// createFunctie: db.insert().values().returning()

describe('POST /api/functies', () => {
  it('creates a functie and returns 201', async () => {
    dbMock.set([FUNCTIE])
    const req = makeRequest('/api/functies', { method: 'POST', body: { titel: 'Product Owner' } })
    const res = await POST(req)
    expect(res.status).toBe(201)
    expect((await res.json()).data.titel).toBe('Product Owner')
  })

  it('returns 400 when titel is missing', async () => {
    const req = makeRequest('/api/functies', { method: 'POST', body: {} })
    expect((await POST(req)).status).toBe(400)
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never)
    const req = makeRequest('/api/functies', { method: 'POST', body: { titel: 'X' } })
    expect((await POST(req)).status).toBe(401)
  })
})

// --- GET /api/functies/[id] ---
// db.select() → single row

describe('GET /api/functies/[id]', () => {
  it('returns 200 with the functie', async () => {
    dbMock.set([FUNCTIE])
    const res = await GetById(makeRequest('/api/functies/functie-1'), { params: Promise.resolve({ id: 'functie-1' }) })
    expect(res.status).toBe(200)
    expect((await res.json()).data.id).toBe('functie-1')
  })

  it('returns 404 for unknown id', async () => {
    dbMock.set([])
    expect((await GetById(makeRequest('/api/functies/missing'), { params: Promise.resolve({ id: 'missing' }) })).status).toBe(404)
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never)
    expect((await GetById(makeRequest('/api/functies/x'), { params: Promise.resolve({ id: 'x' }) })).status).toBe(401)
  })
})

// --- PATCH /api/functies/[id] ---
// updateFunctie: db.select() (before) → db.update().returning()

describe('PATCH /api/functies/[id]', () => {
  it('updates and returns 200', async () => {
    const updated = { ...FUNCTIE, titel: 'Scrum Master' }
    dbMock.set([FUNCTIE], [updated])
    const req = makeRequest('/api/functies/functie-1', { method: 'PATCH', body: { titel: 'Scrum Master' } })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'functie-1' }) })
    expect(res.status).toBe(200)
    expect((await res.json()).data.titel).toBe('Scrum Master')
  })

  it('returns 404 when functie does not exist', async () => {
    dbMock.set([])
    const req = makeRequest('/api/functies/missing', { method: 'PATCH', body: { titel: 'X' } })
    expect((await PATCH(req, { params: Promise.resolve({ id: 'missing' }) })).status).toBe(404)
  })

  it('returns 403 when attempting to rename the sentinel', async () => {
    dbMock.set([SENTINEL])
    const req = makeRequest('/api/functies/sentinel-1', { method: 'PATCH', body: { titel: 'Iets anders' } })
    expect((await PATCH(req, { params: Promise.resolve({ id: 'sentinel-1' }) })).status).toBe(403)
  })
})

// --- DELETE /api/functies/[id] ---
// archiveFunctie: db.select() (before) → db.update() (no returning)

describe('DELETE /api/functies/[id]', () => {
  it('archives and returns 200', async () => {
    dbMock.set([FUNCTIE])
    const res = await DELETE(makeRequest('/api/functies/functie-1'), { params: Promise.resolve({ id: 'functie-1' }) })
    expect(res.status).toBe(200)
    expect((await res.json()).data.id).toBe('functie-1')
  })

  it('returns 404 when functie does not exist', async () => {
    dbMock.set([])
    expect((await DELETE(makeRequest('/api/functies/missing'), { params: Promise.resolve({ id: 'missing' }) })).status).toBe(404)
  })

  it('returns 403 when attempting to archive the sentinel', async () => {
    dbMock.set([SENTINEL])
    expect((await DELETE(makeRequest('/api/functies/sentinel-1'), { params: Promise.resolve({ id: 'sentinel-1' }) })).status).toBe(403)
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never)
    expect((await DELETE(makeRequest('/api/functies/x'), { params: Promise.resolve({ id: 'x' }) })).status).toBe(401)
  })
})
