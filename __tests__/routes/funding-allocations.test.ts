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

import { GET, POST } from '@/app/api/funding-allocations/route'
import { auth } from '@/lib/auth'

const FSA_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const POSITION_ID = 'b1b2c3d4-e5f6-7890-abcd-ef1234567891'
const TEAM_ID = 'c1b2c3d4-e5f6-7890-abcd-ef1234567892'

const ALLOCATION = {
  id: 'alloc-1',
  financialSourceAmountId: FSA_ID,
  positionId: POSITION_ID,
  teamId: null,
  amount: '50000',
  percentage: null,
  startDate: null,
  endDate: null,
  status: 'active',
  reason: null,
  createdBy: 'user-mock',
  createdAt: new Date(),
  updatedAt: new Date(),
}

beforeEach(() => dbMock.reset())

// --- GET /api/funding-allocations ---

describe('GET /api/funding-allocations', () => {
  it('returns 200 with allocations list', async () => {
    dbMock.set([ALLOCATION])
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].id).toBe('alloc-1')
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null)
    expect((await GET()).status).toBe(401)
  })
})

// --- POST /api/funding-allocations ---
// Key domain rule: positionId OR teamId must be provided (not both required, but at least one)

describe('POST /api/funding-allocations', () => {
  it('creates allocation linked to a position and returns 201', async () => {
    dbMock.set([ALLOCATION])
    const req = makeRequest('/api/funding-allocations', {
      method: 'POST',
      body: {
        financialSourceAmountId: FSA_ID,
        positionId: POSITION_ID,
        amount: '50000',
      },
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    expect((await res.json()).data.id).toBe('alloc-1')
  })

  it('creates allocation linked to a team and returns 201', async () => {
    const teamAlloc = { ...ALLOCATION, positionId: null, teamId: TEAM_ID }
    dbMock.set([teamAlloc])
    const req = makeRequest('/api/funding-allocations', {
      method: 'POST',
      body: {
        financialSourceAmountId: FSA_ID,
        teamId: TEAM_ID,
        amount: '100000',
      },
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })

  it('returns 400 when neither positionId nor teamId is provided', async () => {
    // Core domain constraint: funding must be traceable to a position or team
    const req = makeRequest('/api/funding-allocations', {
      method: 'POST',
      body: {
        financialSourceAmountId: FSA_ID,
        amount: '50000',
      },
    })
    expect((await POST(req)).status).toBe(400)
  })

  it('accepts a percentage instead of a fixed amount', async () => {
    dbMock.set([{ ...ALLOCATION, amount: null, percentage: '25' }])
    const req = makeRequest('/api/funding-allocations', {
      method: 'POST',
      body: {
        financialSourceAmountId: FSA_ID,
        positionId: POSITION_ID,
        percentage: '25',
      },
    })
    expect((await POST(req)).status).toBe(201)
  })

  it('accepts optional start and end dates', async () => {
    dbMock.set([ALLOCATION])
    const req = makeRequest('/api/funding-allocations', {
      method: 'POST',
      body: {
        financialSourceAmountId: FSA_ID,
        positionId: POSITION_ID,
        amount: '50000',
        startDate: '2025-01-01T00:00:00.000Z',
        endDate: '2025-12-31T00:00:00.000Z',
      },
    })
    expect((await POST(req)).status).toBe(201)
  })

  it('returns 400 when financialSourceAmountId is missing', async () => {
    const req = makeRequest('/api/funding-allocations', {
      method: 'POST',
      body: { positionId: POSITION_ID, amount: '50000' },
    })
    expect((await POST(req)).status).toBe(400)
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null)
    const req = makeRequest('/api/funding-allocations', {
      method: 'POST',
      body: { financialSourceAmountId: FSA_ID, positionId: POSITION_ID },
    })
    expect((await POST(req)).status).toBe(401)
  })
})
