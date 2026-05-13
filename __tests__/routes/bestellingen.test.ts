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

import { GET, POST } from '@/app/api/bestellingen/route'
import { GET as GET_ID, PATCH, DELETE } from '@/app/api/bestellingen/[id]/route'
import { auth } from '@/lib/auth'

const ORG_ID  = 'a0000001-0000-0000-0000-000000000001'
const TYPE_ID = 'a0000001-0000-0000-0000-000000000002'
const FSA_ID  = 'a0000001-0000-0000-0000-000000000003'

const BESTELLING_ID = 'a0000001-0000-0000-0000-000000000004'
const BESTELLING = {
  id: BESTELLING_ID,
  organisationId: ORG_ID,
  typeId: TYPE_ID,
  atbNummer: 'ATB-2025-001',
  omschrijving: 'Laptops voor het team',
  geraamdBedrag: '15000.00',
  werkelijkBedrag: null,
  aanvraagDatum: null,
  notities: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

beforeEach(() => dbMock.reset())

// ── GET /api/bestellingen ───────────────────────────────────────────────────────

describe('GET /api/bestellingen', () => {
  it('returns 200 with list', async () => {
    dbMock.set([BESTELLING])
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].atbNummer).toBe('ATB-2025-001')
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never)
    expect((await GET()).status).toBe(401)
  })
})

// ── POST /api/bestellingen ──────────────────────────────────────────────────────

describe('POST /api/bestellingen', () => {
  it('creates a bestelling and returns 201', async () => {
    dbMock.set([BESTELLING])
    const req = makeRequest('/api/bestellingen', {
      method: 'POST',
      body: {
        organisationId: ORG_ID,
        typeId: TYPE_ID,
        atbNummer: 'ATB-2025-001',
        omschrijving: 'Laptops voor het team',
        geraamdBedrag: 15000,
      },
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    expect((await res.json()).data.id).toBe(BESTELLING_ID)
  })

  it('returns 400 when atbNummer is missing', async () => {
    const req = makeRequest('/api/bestellingen', {
      method: 'POST',
      body: { organisationId: ORG_ID, typeId: TYPE_ID, omschrijving: 'Test' },
    })
    expect((await POST(req)).status).toBe(400)
  })

  it('returns 400 when omschrijving is missing', async () => {
    const req = makeRequest('/api/bestellingen', {
      method: 'POST',
      body: { organisationId: ORG_ID, typeId: TYPE_ID, atbNummer: 'ATB-001' },
    })
    expect((await POST(req)).status).toBe(400)
  })

  it('returns 400 when organisationId is missing', async () => {
    const req = makeRequest('/api/bestellingen', {
      method: 'POST',
      body: { typeId: TYPE_ID, atbNummer: 'ATB-001', omschrijving: 'Test' },
    })
    expect((await POST(req)).status).toBe(400)
  })

  it('accepts optional fields', async () => {
    dbMock.set([BESTELLING])
    const req = makeRequest('/api/bestellingen', {
      method: 'POST',
      body: {
        organisationId: ORG_ID,
        typeId: TYPE_ID,
        atbNummer: 'ATB-2025-001',
        omschrijving: 'Laptops voor het team',
        geraamdBedrag: 15000,
        aanvraagDatum: '2025-01-15T00:00:00.000Z',
        notities: 'Inclusief docking stations',
      },
    })
    expect((await POST(req)).status).toBe(201)
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never)
    const req = makeRequest('/api/bestellingen', {
      method: 'POST',
      body: { organisationId: ORG_ID, typeId: TYPE_ID, atbNummer: 'ATB-001', omschrijving: 'Test' },
    })
    expect((await POST(req)).status).toBe(401)
  })
})

// ── GET /api/bestellingen/[id] ──────────────────────────────────────────────────

describe('GET /api/bestellingen/[id]', () => {
  it('returns 200 with bestelling detail', async () => {
    dbMock.set(BESTELLING)
    const res = await GET_ID(makeRequest('/api/bestellingen/best-0001'), { params: Promise.resolve({ id: BESTELLING_ID }) })
    expect(res.status).toBe(200)
    expect((await res.json()).data.atbNummer).toBe('ATB-2025-001')
  })

  it('returns 404 when not found', async () => {
    dbMock.set(undefined)
    const res = await GET_ID(makeRequest('/api/bestellingen/missing'), { params: Promise.resolve({ id: 'missing' }) })
    expect(res.status).toBe(404)
  })

  it('returns 404 when soft-deleted', async () => {
    dbMock.set({ ...BESTELLING, deletedAt: new Date() })
    const res = await GET_ID(makeRequest('/api/bestellingen/best-0001'), { params: Promise.resolve({ id: BESTELLING_ID }) })
    expect(res.status).toBe(404)
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never)
    const res = await GET_ID(makeRequest('/api/bestellingen/best-0001'), { params: Promise.resolve({ id: BESTELLING_ID }) })
    expect(res.status).toBe(401)
  })
})

// ── PATCH /api/bestellingen/[id] ───────────────────────────────────────────────

describe('PATCH /api/bestellingen/[id]', () => {
  it('updates fields and returns 200', async () => {
    const updated = { ...BESTELLING, omschrijving: 'Laptops + monitors' }
    dbMock.set([BESTELLING], [updated])
    const req = makeRequest('/api/bestellingen/best-0001', {
      method: 'PATCH',
      body: { omschrijving: 'Laptops + monitors' },
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: BESTELLING_ID }) })
    expect(res.status).toBe(200)
  })

  it('returns 404 when bestelling does not exist', async () => {
    dbMock.set([])
    const req = makeRequest('/api/bestellingen/missing', { method: 'PATCH', body: { omschrijving: 'X' } })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'missing' }) })
    expect(res.status).toBe(404)
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never)
    const req = makeRequest('/api/bestellingen/best-0001', { method: 'PATCH', body: {} })
    const res = await PATCH(req, { params: Promise.resolve({ id: BESTELLING_ID }) })
    expect(res.status).toBe(401)
  })
})

// ── DELETE /api/bestellingen/[id] ──────────────────────────────────────────────

describe('DELETE /api/bestellingen/[id]', () => {
  it('soft-deletes and returns 200', async () => {
    dbMock.set([BESTELLING])
    const res = await DELETE(makeRequest('/api/bestellingen/best-0001'), { params: Promise.resolve({ id: BESTELLING_ID }) })
    expect(res.status).toBe(200)
    expect((await res.json()).data.message).toBe('Gearchiveerd')
  })

  it('returns 404 when bestelling does not exist', async () => {
    dbMock.set([])
    const res = await DELETE(makeRequest('/api/bestellingen/missing'), { params: Promise.resolve({ id: 'missing' }) })
    expect(res.status).toBe(404)
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never)
    const res = await DELETE(makeRequest('/api/bestellingen/best-0001'), { params: Promise.resolve({ id: BESTELLING_ID }) })
    expect(res.status).toBe(401)
  })
})

// ── FundingAllocation with bestellingId ────────────────────────────────────────

describe('POST /api/funding-allocations with bestellingId', () => {
  it('accepts bestellingId as the allocatable target', async () => {
    const { POST: POST_ALLOC } = await import('@/app/api/funding-allocations/route')
    const ALLOC = {
      id: 'alloc-b1',
      financialSourceAmountId: FSA_ID,
      bestellingId: BESTELLING_ID,
      positionId: null,
      teamId: null,
      amount: '15000',
      percentage: null,
      status: 'active',
      reason: null,
      createdBy: 'user-mock',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const sourceAmount = { id: FSA_ID, amount: '500000', status: 'released', releaseDate: null, type: null, allocations: [] }
    dbMock.set(sourceAmount, [ALLOC])
    const req = makeRequest('/api/funding-allocations', {
      method: 'POST',
      body: { financialSourceAmountId: FSA_ID, bestellingId: BESTELLING_ID, amount: '15000' },
    })
    const res = await POST_ALLOC(req)
    expect(res.status).toBe(201)
  })

  it('returns 400 when none of positionId, teamId, bestellingId provided', async () => {
    const { POST: POST_ALLOC } = await import('@/app/api/funding-allocations/route')
    const req = makeRequest('/api/funding-allocations', {
      method: 'POST',
      body: { financialSourceAmountId: FSA_ID, amount: '15000' },
    })
    expect((await POST_ALLOC(req)).status).toBe(400)
  })
})
