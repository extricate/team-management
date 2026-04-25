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

import { GET, POST } from '@/app/api/employees/route'
import { GET as GetById, PATCH, DELETE } from '@/app/api/employees/[id]/route'
import { auth } from '@/lib/auth'

const ORG_ID = 'a1b2c3d4-0000-0000-0000-000000000001'
const EMPLOYEE = {
  id: 'emp-1',
  organisationId: ORG_ID,
  firstName: 'Jan',
  lastName: 'Janssen',
  prefixName: 'de',
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

beforeEach(() => dbMock.reset())

// --- GET /api/employees ---
// Uses db.query.employees.findMany() → array

describe('GET /api/employees', () => {
  it('returns 200 with employees list', async () => {
    dbMock.set([EMPLOYEE])
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].lastName).toBe('Janssen')
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null)
    expect((await GET()).status).toBe(401)
  })
})

// --- POST /api/employees ---

describe('POST /api/employees', () => {
  it('creates an employee with valid data and returns 201', async () => {
    dbMock.set([EMPLOYEE])
    const req = makeRequest('/api/employees', {
      method: 'POST',
      body: { organisationId: ORG_ID, firstName: 'Jan', lastName: 'Janssen' },
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    expect((await res.json()).data.firstName).toBe('Jan')
  })

  it('returns 400 when firstName is missing', async () => {
    const req = makeRequest('/api/employees', {
      method: 'POST',
      body: { organisationId: ORG_ID, lastName: 'Janssen' },
    })
    expect((await POST(req)).status).toBe(400)
  })

  it('returns 400 when lastName is missing', async () => {
    const req = makeRequest('/api/employees', {
      method: 'POST',
      body: { organisationId: ORG_ID, firstName: 'Jan' },
    })
    expect((await POST(req)).status).toBe(400)
  })

  it('returns 400 when organisationId is not a valid UUID', async () => {
    const req = makeRequest('/api/employees', {
      method: 'POST',
      body: { organisationId: 'not-a-uuid', firstName: 'Jan', lastName: 'Janssen' },
    })
    expect((await POST(req)).status).toBe(400)
  })
})

// --- GET /api/employees/[id] ---
// Uses db.query.employees.findFirst() → single object (not an array)

describe('GET /api/employees/[id]', () => {
  it('returns 200 with employee details', async () => {
    dbMock.set(EMPLOYEE)
    const res = await GetById(makeRequest('/api/employees/emp-1'), { params: { id: 'emp-1' } })
    expect(res.status).toBe(200)
    expect((await res.json()).data.id).toBe('emp-1')
  })

  it('returns 404 for unknown employee', async () => {
    dbMock.set(undefined)
    expect((await GetById(makeRequest('/api/employees/missing'), { params: { id: 'missing' } })).status).toBe(404)
  })

  it('returns 404 for a soft-deleted employee', async () => {
    dbMock.set({ ...EMPLOYEE, deletedAt: new Date() })
    expect((await GetById(makeRequest('/api/employees/emp-1'), { params: { id: 'emp-1' } })).status).toBe(404)
  })
})

// --- PATCH /api/employees/[id] ---
// Route: select (before) → update.returning (after)

describe('PATCH /api/employees/[id]', () => {
  it('updates the employee and returns 200', async () => {
    const updated = { ...EMPLOYEE, firstName: 'Piet' }
    dbMock.set([EMPLOYEE], [updated])
    const req = makeRequest('/api/employees/emp-1', { method: 'PATCH', body: { firstName: 'Piet' } })
    const res = await PATCH(req, { params: { id: 'emp-1' } })
    expect(res.status).toBe(200)
    expect((await res.json()).data.firstName).toBe('Piet')
  })

  it('returns 404 when employee does not exist', async () => {
    dbMock.set([])
    const req = makeRequest('/api/employees/missing', { method: 'PATCH', body: { firstName: 'X' } })
    expect((await PATCH(req, { params: { id: 'missing' } })).status).toBe(404)
  })
})

// --- DELETE /api/employees/[id] ---
// Route: select (before) → update (no returning)

describe('DELETE /api/employees/[id]', () => {
  it('soft-deletes the employee and returns 200', async () => {
    dbMock.set([EMPLOYEE])
    const res = await DELETE(makeRequest('/api/employees/emp-1'), { params: { id: 'emp-1' } })
    expect(res.status).toBe(200)
    expect((await res.json()).data.message).toBe('Gearchiveerd')
  })

  it('returns 404 when employee does not exist', async () => {
    dbMock.set([])
    expect((await DELETE(makeRequest('/api/employees/missing'), { params: { id: 'missing' } })).status).toBe(404)
  })
})
