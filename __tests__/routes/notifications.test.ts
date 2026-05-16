import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── DB mock (same proxy pattern as other route tests) ─────────────────────────

type DbMockGlobal = { createDbMock: () => { db: unknown; dbMock: { set: (...d: unknown[]) => void; reset: () => void } } }
const { db, dbMock } = vi.hoisted(() => (globalThis as unknown as DbMockGlobal).createDbMock())

vi.mock('@/lib/db', () => ({ db }))
vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: 'user-mock', email: 'test@example.com', role: 'admin' } }),
}))

import { GET } from '@/app/api/notifications/route'
import { auth } from '@/lib/auth'

// ── Fixture helpers ────────────────────────────────────────────────────────────

function makePosition(overrides: {
  id?: string
  type?: string
  teamId?: string
  status?: string
  expectedStart?: Date | null
  requiredBefore?: Date | null
  fundingAllocations?: Array<{ status: string }>
} = {}) {
  const teamId = overrides.teamId ?? 'team-1'
  return {
    id: overrides.id ?? 'pos-1',
    type: overrides.type ?? 'Product Owner',
    status: overrides.status ?? 'gepland',
    expectedStart: overrides.expectedStart ?? null,
    expectedEnd: null,
    requiredBefore: overrides.requiredBefore ?? null,
    fundingAllocations: overrides.fundingAllocations ?? [],
    teamCouplings: [{ teamId, team: { name: 'Alpha Team' } }],
    deletedAt: null,
  }
}

beforeEach(() => dbMock.reset())

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('GET /api/notifications', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never)
    expect((await GET()).status).toBe(401)
  })

  it('returns 200 with empty conflicts when no positions exist', async () => {
    dbMock.set([])
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.conflicts).toHaveLength(0)
  })

  it('returns a late_start conflict when expectedStart is after requiredBefore', async () => {
    dbMock.set([
      makePosition({
        status: 'gepland',
        expectedStart: new Date('2025-09-01'),
        requiredBefore: new Date('2025-06-01'),
        fundingAllocations: [{ status: 'active' }],
      }),
    ])
    const { conflicts } = (await (await GET()).json()).data
    expect(conflicts.some((c: { type: string }) => c.type === 'late_start')).toBe(true)
  })

  it('returns an unfunded conflict for a planned position with no active allocations', async () => {
    dbMock.set([makePosition({ status: 'gepland', fundingAllocations: [] })])
    const { conflicts } = (await (await GET()).json()).data
    expect(conflicts.some((c: { type: string }) => c.type === 'unfunded')).toBe(true)
  })

  it('returns an unfunded conflict for an open position with only expired allocations', async () => {
    dbMock.set([makePosition({ status: 'open', fundingAllocations: [{ status: 'expired' }] })])
    const { conflicts } = (await (await GET()).json()).data
    expect(conflicts.some((c: { type: string }) => c.type === 'unfunded')).toBe(true)
  })

  it('returns no conflicts for a funded position with no date issues', async () => {
    dbMock.set([makePosition({ status: 'gepland', fundingAllocations: [{ status: 'active' }] })])
    const { conflicts } = (await (await GET()).json()).data
    expect(conflicts).toHaveLength(0)
  })

  it('ignores closed positions even when they have no funding or date conflicts', async () => {
    dbMock.set([
      makePosition({
        status: 'gesloten',
        fundingAllocations: [],
        requiredBefore: new Date('2025-01-01'),
        expectedStart: new Date('2025-12-01'),
      }),
    ])
    const { conflicts } = (await (await GET()).json()).data
    expect(conflicts).toHaveLength(0)
  })

  it('includes correct metadata (positionId, positionType, teamId, teamName) in each conflict', async () => {
    dbMock.set([
      makePosition({
        id: 'pos-abc',
        type: 'Scrum Master',
        teamId: 'team-xyz',
        status: 'gepland',
        fundingAllocations: [],
      }),
    ])
    const { conflicts } = (await (await GET()).json()).data
    const c = conflicts[0]
    expect(c.positionId).toBe('pos-abc')
    expect(c.positionType).toBe('Scrum Master')
    expect(c.teamId).toBe('team-xyz')
    expect(c.teamName).toBe('Alpha Team')
  })

  it('returns one conflict per problematic position', async () => {
    dbMock.set([
      makePosition({ id: 'p1', status: 'gepland', fundingAllocations: [] }),
      makePosition({ id: 'p2', status: 'open',   fundingAllocations: [] }),
    ])
    const { conflicts } = (await (await GET()).json()).data
    expect(conflicts).toHaveLength(2)
  })

  it('does not flag a funded position where expectedStart is before requiredBefore', async () => {
    dbMock.set([
      makePosition({
        status: 'open',
        expectedStart: new Date('2025-06-01'),
        requiredBefore: new Date('2025-09-01'),
        fundingAllocations: [{ status: 'active' }],
      }),
    ])
    const { conflicts } = (await (await GET()).json()).data
    expect(conflicts).toHaveLength(0)
  })
})
