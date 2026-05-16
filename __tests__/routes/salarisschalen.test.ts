import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeRequest } from '../helpers/request'

type DbMockGlobal = { createDbMock: () => { db: unknown; dbMock: { set: (...d: unknown[]) => void; reset: () => void } } }
const { db, dbMock } = vi.hoisted(() => (globalThis as unknown as DbMockGlobal).createDbMock())

vi.mock('@/lib/db', () => ({ db }))
vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: 'user-mock', email: 'test@example.com', role: 'admin' } }),
}))
vi.mock('@/lib/audit', () => ({ logAudit: vi.fn().mockResolvedValue(undefined) }))

import { GET, POST } from '@/app/api/salarisschalen/route'
import { GET as GetById, PATCH, DELETE } from '@/app/api/salarisschalen/[id]/route'
import { GET as Lookup } from '@/app/api/salarisschalen/lookup/route'
import { auth } from '@/lib/auth'

const SCHAAL = {
  id: 'schaal-1',
  schaalCode: '10',
  year: 2025,
  primaryCost: '80000.00',
  secondaryEffects: '20000.00',
  tertiaryEffects: '5000.00',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
}

beforeEach(() => dbMock.reset())

// ── GET /api/salarisschalen ────────────────────────────────────────────────────

describe('GET /api/salarisschalen', () => {
  it('returns 200 with list', async () => {
    dbMock.set([SCHAAL])
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].schaalCode).toBe('10')
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never)
    expect((await GET()).status).toBe(401)
  })
})

// ── POST /api/salarisschalen ───────────────────────────────────────────────────

describe('POST /api/salarisschalen', () => {
  it('creates a schaal entry and returns 201', async () => {
    dbMock.set([SCHAAL])
    const res = await POST(makeRequest('/api/salarisschalen', {
      method: 'POST',
      body: { schaalCode: '10', year: 2025, primaryCost: 80000, secondaryEffects: 20000, tertiaryEffects: 5000 },
    }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.schaalCode).toBe('10')
  })

  it('returns 400 when primaryCost is missing', async () => {
    const res = await POST(makeRequest('/api/salarisschalen', {
      method: 'POST',
      body: { schaalCode: '10', year: 2025 },
    }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when year is out of range', async () => {
    const res = await POST(makeRequest('/api/salarisschalen', {
      method: 'POST',
      body: { schaalCode: '10', year: 1990, primaryCost: 80000, secondaryEffects: 0, tertiaryEffects: 0 },
    }))
    expect(res.status).toBe(400)
  })

  it('returns 409 when schaalCode+year combination already exists', async () => {
    const uniqueError = Object.assign(new Error('duplicate key'), { code: '23505' })
    dbMock.set(Promise.reject(uniqueError))
    const res = await POST(makeRequest('/api/salarisschalen', {
      method: 'POST',
      body: { schaalCode: '10', year: 2025, primaryCost: 80000, secondaryEffects: 0, tertiaryEffects: 0 },
    }))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toMatch(/bestaat al/)
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never)
    expect((await POST(makeRequest('/api/salarisschalen', { method: 'POST', body: {} }))).status).toBe(401)
  })
})

// ── GET /api/salarisschalen/[id] ──────────────────────────────────────────────

describe('GET /api/salarisschalen/[id]', () => {
  it('returns 200 with the schaal', async () => {
    dbMock.set([SCHAAL])
    const res = await GetById(makeRequest('/api/salarisschalen/schaal-1'), { params: Promise.resolve({ id: 'schaal-1' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.id).toBe('schaal-1')
  })

  it('returns 404 when not found', async () => {
    dbMock.set([])
    const res = await GetById(makeRequest('/api/salarisschalen/schaal-1'), { params: Promise.resolve({ id: 'schaal-1' }) })
    expect(res.status).toBe(404)
  })
})

// ── PATCH /api/salarisschalen/[id] ────────────────────────────────────────────

describe('PATCH /api/salarisschalen/[id]', () => {
  it('updates a schaal and returns 200', async () => {
    const updated = { ...SCHAAL, primaryCost: '85000.00' }
    dbMock.set([SCHAAL], [updated])
    const res = await PATCH(
      makeRequest('/api/salarisschalen/schaal-1', { method: 'PATCH', body: { primaryCost: 85000 } }),
      { params: Promise.resolve({ id: 'schaal-1' }) },
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.primaryCost).toBe('85000.00')
  })

  it('returns 404 when not found', async () => {
    dbMock.set([])
    const res = await PATCH(
      makeRequest('/api/salarisschalen/schaal-1', { method: 'PATCH', body: { primaryCost: 85000 } }),
      { params: Promise.resolve({ id: 'schaal-1' }) },
    )
    expect(res.status).toBe(404)
  })

  it('returns 409 when updated schaalCode+year combination already exists', async () => {
    const uniqueError = Object.assign(new Error('duplicate key'), { code: '23505' })
    dbMock.set([SCHAAL], Promise.reject(uniqueError))
    const res = await PATCH(
      makeRequest('/api/salarisschalen/schaal-1', { method: 'PATCH', body: { schaalCode: '11', year: 2025 } }),
      { params: Promise.resolve({ id: 'schaal-1' }) },
    )
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toMatch(/bestaat al/)
  })
})

// ── DELETE /api/salarisschalen/[id] ───────────────────────────────────────────

describe('DELETE /api/salarisschalen/[id]', () => {
  it('deletes a schaal and returns 200', async () => {
    dbMock.set([SCHAAL])
    const res = await DELETE(
      makeRequest('/api/salarisschalen/schaal-1', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 'schaal-1' }) },
    )
    expect(res.status).toBe(200)
  })

  it('returns 404 when not found', async () => {
    dbMock.set([])
    const res = await DELETE(
      makeRequest('/api/salarisschalen/schaal-1', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 'schaal-1' }) },
    )
    expect(res.status).toBe(404)
  })
})

// ── GET /api/salarisschalen/lookup ────────────────────────────────────────────

describe('GET /api/salarisschalen/lookup', () => {
  it('returns exact match with isExact=true and totalCost', async () => {
    dbMock.set([SCHAAL])
    const res = await Lookup(makeRequest('/api/salarisschalen/lookup', { searchParams: { schaal: '10', year: '2025' } }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.isExact).toBe(true)
    expect(body.data.foundYear).toBe(2025)
    expect(body.data.totalCost).toBe(105000)
  })

  it('returns fallback with isExact=false when year not found', async () => {
    dbMock.set([SCHAAL])
    const res = await Lookup(makeRequest('/api/salarisschalen/lookup', { searchParams: { schaal: '10', year: '2027' } }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.isExact).toBe(false)
    expect(body.data.foundYear).toBe(2025)
  })

  it('returns 404 when schaal code not found at all', async () => {
    dbMock.set([SCHAAL])
    const res = await Lookup(makeRequest('/api/salarisschalen/lookup', { searchParams: { schaal: '99', year: '2025' } }))
    expect(res.status).toBe(404)
  })

  it('returns 400 when schaal param is missing', async () => {
    const res = await Lookup(makeRequest('/api/salarisschalen/lookup', { searchParams: { year: '2025' } }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when year param is missing', async () => {
    const res = await Lookup(makeRequest('/api/salarisschalen/lookup', { searchParams: { schaal: '10' } }))
    expect(res.status).toBe(400)
  })
})
