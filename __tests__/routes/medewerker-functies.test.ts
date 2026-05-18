import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeRequest } from '../helpers/request'

type DbMockGlobal = { createDbMock: () => { db: unknown; dbMock: { set: (...d: unknown[]) => void; reset: () => void } } }
const { db, dbMock } = vi.hoisted(() => (globalThis as unknown as DbMockGlobal).createDbMock())

vi.mock('@/lib/db', () => ({ db }))
vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: 'user-mock', email: 'test@example.com', role: 'admin' } }),
}))
vi.mock('@/lib/audit', () => ({ logAudit: vi.fn().mockResolvedValue(undefined) }))

import { GET, POST } from '@/app/api/medewerkers/[id]/functies/route'
import { DELETE } from '@/app/api/medewerkers/[id]/functies/[functieId]/route'
import { PATCH as PatchPrimair } from '@/app/api/medewerkers/[id]/functies/[functieId]/primair/route'
import { auth } from '@/lib/auth'

const EMP_ID = 'a1b2c3d4-0000-0000-0000-000000000001'
const FUNCTIE_ID = 'a1b2c3d4-0000-0000-0000-000000000002'
const ASSIGNMENT_ID = 'a1b2c3d4-0000-0000-0000-000000000003'

const ASSIGNMENT = {
  id: ASSIGNMENT_ID,
  employeeId: EMP_ID,
  functieId: FUNCTIE_ID,
  isPrimary: false,
  startDate: new Date('2024-01-01'),
  endDate: null,
  status: 'active',
  reason: null,
  createdBy: 'user-mock',
  createdAt: new Date(),
  updatedAt: new Date(),
}

const FUNCTIE = {
  id: FUNCTIE_ID,
  titel: 'Product Owner',
  schaalCode: '12',
  isActive: true,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

beforeEach(() => dbMock.reset())

// --- GET /api/medewerkers/[id]/functies ---
// db.select({ assignment, functie }).from(medewerkerFuncties).innerJoin(...).where(...).orderBy(...)

describe('GET /api/medewerkers/[id]/functies', () => {
  it('returns 200 with assignments', async () => {
    dbMock.set([{ assignment: ASSIGNMENT, functie: FUNCTIE }])
    const res = await GET(makeRequest(`/api/medewerkers/${EMP_ID}/functies`), { params: Promise.resolve({ id: EMP_ID }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].functie.titel).toBe('Product Owner')
  })

  it('returns 200 with empty list when no assignments', async () => {
    dbMock.set([])
    const res = await GET(makeRequest(`/api/medewerkers/${EMP_ID}/functies`), { params: Promise.resolve({ id: EMP_ID }) })
    expect(res.status).toBe(200)
    expect((await res.json()).data).toHaveLength(0)
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never)
    expect((await GET(makeRequest(`/api/medewerkers/${EMP_ID}/functies`), { params: Promise.resolve({ id: EMP_ID }) })).status).toBe(401)
  })
})

// --- POST /api/medewerkers/[id]/functies ---
// assignFunctie (non-primary): db.insert().values().returning()
// assignFunctie (isPrimary): db.update() (clearPrimary) → db.insert().values().returning()

describe('POST /api/medewerkers/[id]/functies', () => {
  it('creates an assignment and returns 201', async () => {
    dbMock.set([ASSIGNMENT])
    const req = makeRequest(`/api/medewerkers/${EMP_ID}/functies`, {
      method: 'POST',
      body: { functieId: FUNCTIE_ID, startDate: '2024-01-01T00:00:00.000Z' },
    })
    const res = await POST(req, { params: Promise.resolve({ id: EMP_ID }) })
    expect(res.status).toBe(201)
    expect((await res.json()).data.employeeId).toBe(EMP_ID)
  })

  it('clears existing primary when isPrimary is true', async () => {
    // clearPrimary → db.update() (sticky), then db.insert().returning()
    dbMock.set([ASSIGNMENT])
    const req = makeRequest(`/api/medewerkers/${EMP_ID}/functies`, {
      method: 'POST',
      body: { functieId: FUNCTIE_ID, startDate: '2024-01-01T00:00:00.000Z', isPrimary: true },
    })
    const res = await POST(req, { params: Promise.resolve({ id: EMP_ID }) })
    expect(res.status).toBe(201)
  })

  it('returns 400 when functieId is missing', async () => {
    const req = makeRequest(`/api/medewerkers/${EMP_ID}/functies`, {
      method: 'POST',
      body: { startDate: '2024-01-01T00:00:00.000Z' },
    })
    expect((await POST(req, { params: Promise.resolve({ id: EMP_ID }) })).status).toBe(400)
  })

  it('returns 400 when startDate is missing', async () => {
    const req = makeRequest(`/api/medewerkers/${EMP_ID}/functies`, {
      method: 'POST',
      body: { functieId: FUNCTIE_ID },
    })
    expect((await POST(req, { params: Promise.resolve({ id: EMP_ID }) })).status).toBe(400)
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never)
    const req = makeRequest(`/api/medewerkers/${EMP_ID}/functies`, {
      method: 'POST',
      body: { functieId: FUNCTIE_ID, startDate: '2024-01-01T00:00:00.000Z' },
    })
    expect((await POST(req, { params: Promise.resolve({ id: EMP_ID }) })).status).toBe(401)
  })
})

// --- DELETE /api/medewerkers/[id]/functies/[functieId] ---
// endFunctie: db.select() → db.update() (no returning)

describe('DELETE /api/medewerkers/[id]/functies/[functieId]', () => {
  it('ends the assignment and returns 200', async () => {
    dbMock.set([ASSIGNMENT])
    const res = await DELETE(
      makeRequest(`/api/medewerkers/${EMP_ID}/functies/${ASSIGNMENT_ID}`),
      { params: Promise.resolve({ id: EMP_ID, functieId: ASSIGNMENT_ID }) },
    )
    expect(res.status).toBe(200)
    expect((await res.json()).data.id).toBe(ASSIGNMENT_ID)
  })

  it('returns 404 when assignment does not exist', async () => {
    dbMock.set([])
    expect((await DELETE(
      makeRequest(`/api/medewerkers/${EMP_ID}/functies/missing`),
      { params: Promise.resolve({ id: EMP_ID, functieId: 'missing' }) },
    )).status).toBe(404)
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never)
    expect((await DELETE(
      makeRequest(`/api/medewerkers/${EMP_ID}/functies/${ASSIGNMENT_ID}`),
      { params: Promise.resolve({ id: EMP_ID, functieId: ASSIGNMENT_ID }) },
    )).status).toBe(401)
  })
})

// --- PATCH /api/medewerkers/[id]/functies/[functieId]/primair ---
// setPrimary: db.select() (target) → db.update() (clearPrimary) → db.update() (set primary)
// then route: db.select() (return updated row)

describe('PATCH /api/medewerkers/[id]/functies/[functieId]/primair', () => {
  it('sets primary and returns 200 with updated row', async () => {
    const updated = { ...ASSIGNMENT, isPrimary: true }
    // setPrimary: select target, clearPrimary update (sticky), set-primary update (sticky)
    // route final select: returns updated
    dbMock.set([ASSIGNMENT], [updated])
    const res = await PatchPrimair(
      makeRequest(`/api/medewerkers/${EMP_ID}/functies/${ASSIGNMENT_ID}/primair`),
      { params: Promise.resolve({ id: EMP_ID, functieId: ASSIGNMENT_ID }) },
    )
    expect(res.status).toBe(200)
    expect((await res.json()).data.isPrimary).toBe(true)
  })

  it('returns 404 when assignment does not exist', async () => {
    dbMock.set([])
    expect((await PatchPrimair(
      makeRequest(`/api/medewerkers/${EMP_ID}/functies/missing/primair`),
      { params: Promise.resolve({ id: EMP_ID, functieId: 'missing' }) },
    )).status).toBe(404)
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never)
    expect((await PatchPrimair(
      makeRequest(`/api/medewerkers/${EMP_ID}/functies/${ASSIGNMENT_ID}/primair`),
      { params: Promise.resolve({ id: EMP_ID, functieId: ASSIGNMENT_ID }) },
    )).status).toBe(401)
  })
})
