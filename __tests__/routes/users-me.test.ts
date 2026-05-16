import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeRequest } from '../helpers/request'

type DbMockGlobal = { createDbMock: () => { db: unknown; dbMock: { set: (...d: unknown[]) => void; reset: () => void } } }
const { db, dbMock } = vi.hoisted(() => (globalThis as unknown as DbMockGlobal).createDbMock())

vi.mock('@/lib/db', () => ({ db }))
vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: 'user-1', email: 'test@example.com', role: 'viewer' } }),
}))

import { PATCH } from '@/app/api/users/me/route'
import { auth } from '@/lib/auth'

const ORG_UUID = '11111111-1111-1111-1111-111111111111'
const UPDATED_USER = { id: 'user-1', defaultOrganisationId: ORG_UUID }

beforeEach(() => dbMock.reset())

describe('PATCH /api/users/me', () => {
  it('sets defaultOrganisationId to a valid UUID', async () => {
    dbMock.set([UPDATED_USER])
    const req = makeRequest('/api/users/me', {
      method: 'PATCH',
      body: { defaultOrganisationId: ORG_UUID },
    })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.defaultOrganisationId).toBe(ORG_UUID)
  })

  it('clears defaultOrganisationId when set to null', async () => {
    dbMock.set([{ id: 'user-1', defaultOrganisationId: null }])
    const req = makeRequest('/api/users/me', {
      method: 'PATCH',
      body: { defaultOrganisationId: null },
    })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.defaultOrganisationId).toBeNull()
  })

  it('returns 400 for an invalid UUID', async () => {
    const req = makeRequest('/api/users/me', {
      method: 'PATCH',
      body: { defaultOrganisationId: 'not-a-uuid' },
    })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 for missing body field', async () => {
    const req = makeRequest('/api/users/me', {
      method: 'PATCH',
      body: {},
    })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never)
    const req = makeRequest('/api/users/me', {
      method: 'PATCH',
      body: { defaultOrganisationId: 'org-1' },
    })
    const res = await PATCH(req)
    expect(res.status).toBe(401)
  })
})
