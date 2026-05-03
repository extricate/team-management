import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── DB mock (same proxy pattern as other route tests) ─────────────────────────

const { db, dbMock } = vi.hoisted(() => {
  const q: unknown[] = []
  const val = () => (q.length > 1 ? q.shift() : q.length === 1 ? q[0] : [])
  const p = (): unknown =>
    new Proxy(function () {}, {
      get(_, k: string | symbol) {
        if (typeof k === 'symbol') return undefined
        if (k === 'then')
          return (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
            Promise.resolve(val()).then(res, rej)
        if (k === 'catch')
          return (fn: (e: unknown) => unknown) => Promise.resolve(val()).catch(fn)
        if (k === 'finally')
          return (fn: () => void) => Promise.resolve(val()).finally(fn)
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

import { GET } from '@/app/api/notifications/route'
import { auth } from '@/lib/auth'

// ── Fixture helpers ────────────────────────────────────────────────────────────

const TEAM = { name: 'Alpha Team' }

function makePosition(overrides: {
  id?: string
  type?: string
  teamId?: string
  status?: string
  expectedStart?: Date | null
  requiredBefore?: Date | null
  fundingAllocations?: Array<{ status: string }>
} = {}) {
  return {
    id: overrides.id ?? 'pos-1',
    type: overrides.type ?? 'Product Owner',
    teamId: overrides.teamId ?? 'team-1',
    status: overrides.status ?? 'planned',
    expectedStart: overrides.expectedStart ?? null,
    expectedEnd: null,
    requiredBefore: overrides.requiredBefore ?? null,
    fundingAllocations: overrides.fundingAllocations ?? [],
    team: TEAM,
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
        status: 'planned',
        expectedStart: new Date('2025-09-01'),
        requiredBefore: new Date('2025-06-01'),
        fundingAllocations: [{ status: 'active' }],
      }),
    ])
    const { conflicts } = (await (await GET()).json()).data
    expect(conflicts.some((c: { type: string }) => c.type === 'late_start')).toBe(true)
  })

  it('returns an unfunded conflict for a planned position with no active allocations', async () => {
    dbMock.set([makePosition({ status: 'planned', fundingAllocations: [] })])
    const { conflicts } = (await (await GET()).json()).data
    expect(conflicts.some((c: { type: string }) => c.type === 'unfunded')).toBe(true)
  })

  it('returns an unfunded conflict for an open position with only expired allocations', async () => {
    dbMock.set([makePosition({ status: 'open', fundingAllocations: [{ status: 'expired' }] })])
    const { conflicts } = (await (await GET()).json()).data
    expect(conflicts.some((c: { type: string }) => c.type === 'unfunded')).toBe(true)
  })

  it('returns no conflicts for a funded position with no date issues', async () => {
    dbMock.set([makePosition({ status: 'planned', fundingAllocations: [{ status: 'active' }] })])
    const { conflicts } = (await (await GET()).json()).data
    expect(conflicts).toHaveLength(0)
  })

  it('ignores closed positions even when they have no funding or date conflicts', async () => {
    dbMock.set([
      makePosition({
        status: 'closed',
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
        status: 'planned',
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
      makePosition({ id: 'p1', status: 'planned', fundingAllocations: [] }),
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
