import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeRequest } from '../helpers/request'

vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: 'user-mock', email: 'test@example.com', role: 'admin' } }),
}))
vi.mock('@/lib/services/teams', () => ({
  createTeamsBulk: vi.fn().mockResolvedValue({ created: 0, skipped: 0, errors: [] }),
}))

import { POST } from '@/app/api/teams/bulk/route'
import { auth } from '@/lib/auth'
import { createTeamsBulk } from '@/lib/services/teams'

const ORG_ID = 'a1b2c3d4-0000-0000-0000-000000000001'

beforeEach(() => vi.clearAllMocks())

describe('POST /api/teams/bulk', () => {
  it('returns 200 with results on valid input', async () => {
    vi.mocked(createTeamsBulk).mockResolvedValueOnce({ created: 3, skipped: 1, errors: [] })
    const req = makeRequest('/api/teams/bulk', {
      method: 'POST',
      body: { organisationId: ORG_ID, names: ['A', 'B', 'C'] },
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect((await res.json()).data).toEqual({ created: 3, skipped: 1, errors: [] })
  })

  it('calls createTeamsBulk with parsed organisationId and names', async () => {
    const req = makeRequest('/api/teams/bulk', {
      method: 'POST',
      body: { organisationId: ORG_ID, names: ['Team A', 'Team B'] },
    })
    await POST(req)
    expect(createTeamsBulk).toHaveBeenCalledWith(ORG_ID, ['Team A', 'Team B'], 'user-mock')
  })

  it('returns 400 when organisationId is missing', async () => {
    const req = makeRequest('/api/teams/bulk', { method: 'POST', body: { names: ['A'] } })
    expect((await POST(req)).status).toBe(400)
  })

  it('returns 400 when names array is empty', async () => {
    const req = makeRequest('/api/teams/bulk', {
      method: 'POST',
      body: { organisationId: ORG_ID, names: [] },
    })
    expect((await POST(req)).status).toBe(400)
  })

  it('returns 400 when organisationId is not a valid UUID', async () => {
    const req = makeRequest('/api/teams/bulk', {
      method: 'POST',
      body: { organisationId: 'not-a-uuid', names: ['A'] },
    })
    expect((await POST(req)).status).toBe(400)
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never)
    const req = makeRequest('/api/teams/bulk', {
      method: 'POST',
      body: { organisationId: ORG_ID, names: ['A'] },
    })
    expect((await POST(req)).status).toBe(401)
  })
})
