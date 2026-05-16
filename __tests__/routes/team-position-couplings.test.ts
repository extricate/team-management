import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeRequest } from '../helpers/request'

type DbMockGlobal = { createDbMock: () => { db: unknown; dbMock: { set: (...d: unknown[]) => void; reset: () => void } } }
const { db, dbMock } = vi.hoisted(() => (globalThis as unknown as DbMockGlobal).createDbMock())

vi.mock('@/lib/db', () => ({ db }))
vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: 'user-mock', email: 'test@example.com', role: 'admin' } }),
}))
vi.mock('@/lib/audit', () => ({ logAudit: vi.fn().mockResolvedValue(undefined) }))

import { POST } from '@/app/api/team-position-couplings/route'
import { PATCH } from '@/app/api/team-position-couplings/[id]/route'
import { auth } from '@/lib/auth'


const TEAM_ID = 'bbbbbbbb-0000-0000-0000-000000000001'
const POS_ID  = 'cccccccc-0000-0000-0000-000000000001'

const COUPLING = {
  id: 'coup-1',
  teamId: TEAM_ID,
  positionId: POS_ID,
  startDate: new Date('2025-01-01'),
  endDate: null,
  createdBy: 'user-mock',
  createdAt: new Date(),
  updatedAt: new Date(),
}

beforeEach(() => dbMock.reset())

// --- POST /api/team-position-couplings ---

describe('POST /api/team-position-couplings', () => {
  it('creates a coupling and returns 201', async () => {
    dbMock.set(null, [COUPLING]) // null = no active coupling found, then insert returns row
    const req = makeRequest('/api/team-position-couplings', {
      method: 'POST',
      body: { teamId: TEAM_ID, positionId: POS_ID, startDate: '2025-01-01T00:00:00.000Z' },
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.teamId).toBe(TEAM_ID)
    expect(body.data.positionId).toBe(POS_ID)
    expect(body.data.endDate).toBeNull()
  })

  it('returns 409 when position already has an active coupling', async () => {
    dbMock.set(COUPLING) // active coupling found
    const req = makeRequest('/api/team-position-couplings', {
      method: 'POST',
      body: { teamId: TEAM_ID, positionId: POS_ID, startDate: '2025-01-01T00:00:00.000Z' },
    })
    const res = await POST(req)
    expect(res.status).toBe(409)
  })

  it('returns 400 when teamId is missing', async () => {
    const req = makeRequest('/api/team-position-couplings', {
      method: 'POST',
      body: { positionId: POS_ID, startDate: '2025-01-01T00:00:00.000Z' },
    })
    expect((await POST(req)).status).toBe(400)
  })

  it('returns 400 when positionId is missing', async () => {
    const req = makeRequest('/api/team-position-couplings', {
      method: 'POST',
      body: { teamId: TEAM_ID, startDate: '2025-01-01T00:00:00.000Z' },
    })
    expect((await POST(req)).status).toBe(400)
  })

  it('returns 400 when startDate is missing', async () => {
    const req = makeRequest('/api/team-position-couplings', {
      method: 'POST',
      body: { teamId: TEAM_ID, positionId: POS_ID },
    })
    expect((await POST(req)).status).toBe(400)
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never)
    const req = makeRequest('/api/team-position-couplings', {
      method: 'POST',
      body: { teamId: TEAM_ID, positionId: POS_ID, startDate: '2025-01-01T00:00:00.000Z' },
    })
    expect((await POST(req)).status).toBe(401)
  })
})

// --- PATCH /api/team-position-couplings/[id] ---

describe('PATCH /api/team-position-couplings/[id]', () => {
  it('ends the coupling by setting endDate and returns 200', async () => {
    const ended = { ...COUPLING, endDate: new Date('2025-06-01') }
    dbMock.set([COUPLING], [ended])
    const req = makeRequest('/api/team-position-couplings/coup-1', {
      method: 'PATCH',
      body: { endDate: '2025-06-01T00:00:00.000Z' },
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'coup-1' }) })
    expect(res.status).toBe(200)
    expect((await res.json()).data.endDate).toBeTruthy()
  })

  it('returns 404 when coupling does not exist', async () => {
    dbMock.set([])
    const req = makeRequest('/api/team-position-couplings/missing', {
      method: 'PATCH',
      body: { endDate: '2025-06-01T00:00:00.000Z' },
    })
    expect((await PATCH(req, { params: Promise.resolve({ id: 'missing' }) })).status).toBe(404)
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never)
    const req = makeRequest('/api/team-position-couplings/coup-1', {
      method: 'PATCH',
      body: { endDate: '2025-06-01T00:00:00.000Z' },
    })
    expect((await PATCH(req, { params: Promise.resolve({ id: 'coup-1' }) })).status).toBe(401)
  })
})
