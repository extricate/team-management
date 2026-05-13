import { describe, it, expect, vi, beforeEach } from 'vitest'

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
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/audit', () => ({ logAudit: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/search/sync', () => ({ dispatchSync: vi.fn() }))

import { createTeamsBulk } from '@/lib/services/teams'
import { dispatchSync } from '@/lib/search/sync'

const ORG_ID = 'a1b2c3d4-0000-0000-0000-000000000001'
const TEAM1 = {
  id: 'team-1',
  organisationId: ORG_ID,
  name: 'Engineering',
  description: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}
const TEAM2 = {
  id: 'team-2',
  organisationId: ORG_ID,
  name: 'Platform',
  description: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

beforeEach(() => { dbMock.reset(); vi.clearAllMocks() })

describe('createTeamsBulk', () => {
  it('creates all teams when none exist and returns created count', async () => {
    // findFirst(undefined=not found) + insert.returning([TEAM1]) × 2
    dbMock.set(undefined, [TEAM1], undefined, [TEAM2])
    const result = await createTeamsBulk(ORG_ID, ['Engineering', 'Platform'], 'user-1')
    expect(result).toEqual({ created: 2, skipped: 0, errors: [] })
  })

  it('skips teams that already exist', async () => {
    dbMock.set(TEAM1) // findFirst returns existing team
    const result = await createTeamsBulk(ORG_ID, ['Engineering'], 'user-1')
    expect(result).toEqual({ created: 0, skipped: 1, errors: [] })
  })

  it('creates new and skips existing in one call', async () => {
    // 'Engineering' exists, 'Platform' does not
    dbMock.set(TEAM1, undefined, [TEAM2])
    const result = await createTeamsBulk(ORG_ID, ['Engineering', 'Platform'], 'user-1')
    expect(result).toEqual({ created: 1, skipped: 1, errors: [] })
  })

  it('dispatches sync for each created team', async () => {
    dbMock.set(undefined, [TEAM1])
    await createTeamsBulk(ORG_ID, ['Engineering'], 'user-1')
    expect(dispatchSync).toHaveBeenCalledWith('team', TEAM1.id)
  })

  it('skips blank and whitespace-only names silently', async () => {
    const result = await createTeamsBulk(ORG_ID, ['', '  ', '\t'], 'user-1')
    expect(result).toEqual({ created: 0, skipped: 0, errors: [] })
  })

  it('trims whitespace around team names', async () => {
    dbMock.set(undefined, [TEAM1])
    const result = await createTeamsBulk(ORG_ID, ['  Engineering  '], 'user-1')
    expect(result.created).toBe(1)
  })
})
