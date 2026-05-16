import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeRequest } from '../helpers/request'

type DbMockGlobal = { createDbMock: () => { db: unknown; dbMock: { set: (...d: unknown[]) => void; reset: () => void } } }
const { db, dbMock } = vi.hoisted(() => (globalThis as unknown as DbMockGlobal).createDbMock())

vi.mock('@/lib/db', () => ({ db }))
vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: 'user-mock', email: 'test@example.com', role: 'admin' } }),
}))
vi.mock('@/lib/audit', () => ({ logAudit: vi.fn().mockResolvedValue(undefined) }))

import { PUT } from '@/app/api/financial-sources/[id]/budget-grid/route'
import { auth } from '@/lib/auth'

const SOURCE_ID = 'src-0000-0000-0000-000000000001'
const VALID_ENTRIES = [
  { type: 'PERSEX', year: 2025, amount: 100_000, status: 'concept' },
  { type: 'MATEX', year: 2025, amount: 50_000, status: 'released' },
]

beforeEach(() => dbMock.reset())

describe('PUT /api/financial-sources/[id]/budget-grid', () => {
  it('returns 200 with updated count on valid request', async () => {
    // source lookup → existing type lookup → existing amounts lookup (per entry × 2)
    // Each entry: select type (empty) → insert type → select amounts (empty) → insert amount
    dbMock.set(
      [{ id: SOURCE_ID }],    // source exists
      [],                      // no existing type for entry 1
      [{ id: 'type-1', financialSourceId: SOURCE_ID, type: 'PERSEX', year: 2025 }], // insert type 1 returning
      [],                      // no existing amounts for type 1
      [],                      // no existing type for entry 2
      [{ id: 'type-2', financialSourceId: SOURCE_ID, type: 'MATEX', year: 2025 }],  // insert type 2 returning
      [],                      // no existing amounts for type 2
    )
    const req = makeRequest(`/api/financial-sources/${SOURCE_ID}/budget-grid`, {
      method: 'PUT',
      body: { entries: VALID_ENTRIES },
    })
    const res = await PUT(req, { params: Promise.resolve({ id: SOURCE_ID }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.updated).toBe(2)
  })

  it('returns 404 when the financial source does not exist', async () => {
    dbMock.set([]) // source not found
    const req = makeRequest(`/api/financial-sources/unknown/budget-grid`, {
      method: 'PUT',
      body: { entries: VALID_ENTRIES },
    })
    const res = await PUT(req, { params: Promise.resolve({ id: 'unknown' }) })
    expect(res.status).toBe(404)
  })

  it('returns 400 when entries array is missing', async () => {
    dbMock.set([{ id: SOURCE_ID }])
    const req = makeRequest(`/api/financial-sources/${SOURCE_ID}/budget-grid`, {
      method: 'PUT',
      body: {},
    })
    const res = await PUT(req, { params: Promise.resolve({ id: SOURCE_ID }) })
    expect(res.status).toBe(400)
  })

  it('returns 400 when entries array is empty', async () => {
    dbMock.set([{ id: SOURCE_ID }])
    const req = makeRequest(`/api/financial-sources/${SOURCE_ID}/budget-grid`, {
      method: 'PUT',
      body: { entries: [] },
    })
    const res = await PUT(req, { params: Promise.resolve({ id: SOURCE_ID }) })
    expect(res.status).toBe(400)
  })

  it('returns 400 when entry has an invalid type', async () => {
    dbMock.set([{ id: SOURCE_ID }])
    const req = makeRequest(`/api/financial-sources/${SOURCE_ID}/budget-grid`, {
      method: 'PUT',
      body: { entries: [{ type: 'INVALID', year: 2025, amount: 10_000 }] },
    })
    const res = await PUT(req, { params: Promise.resolve({ id: SOURCE_ID }) })
    expect(res.status).toBe(400)
  })

  it('returns 400 when amount is negative', async () => {
    dbMock.set([{ id: SOURCE_ID }])
    const req = makeRequest(`/api/financial-sources/${SOURCE_ID}/budget-grid`, {
      method: 'PUT',
      body: { entries: [{ type: 'PERSEX', year: 2025, amount: -5_000 }] },
    })
    const res = await PUT(req, { params: Promise.resolve({ id: SOURCE_ID }) })
    expect(res.status).toBe(400)
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never)
    const req = makeRequest(`/api/financial-sources/${SOURCE_ID}/budget-grid`, {
      method: 'PUT',
      body: { entries: VALID_ENTRIES },
    })
    const res = await PUT(req, { params: Promise.resolve({ id: SOURCE_ID }) })
    expect(res.status).toBe(401)
  })

  it('skips entries with zero amount (counts only positive upserts)', async () => {
    dbMock.set(
      [{ id: SOURCE_ID }],
      [],
      [{ id: 'type-1', financialSourceId: SOURCE_ID, type: 'PERSEX', year: 2025 }],
      [],
    )
    const req = makeRequest(`/api/financial-sources/${SOURCE_ID}/budget-grid`, {
      method: 'PUT',
      body: {
        entries: [
          { type: 'PERSEX', year: 2025, amount: 100_000 },
          { type: 'MATEX', year: 2025, amount: 0 },
        ],
      },
    })
    const res = await PUT(req, { params: Promise.resolve({ id: SOURCE_ID }) })
    expect(res.status).toBe(200)
    expect((await res.json()).data.updated).toBe(1)
  })
})
