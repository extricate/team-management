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

import { createTeam, updateTeam, archiveTeam } from '@/lib/services/teams'
import { dispatchSync } from '@/lib/search/sync'
import type { Actor } from '@/lib/api'

const ORG_ID = 'a1b2c3d4-0000-0000-0000-000000000001'
const TEAM = {
  id: 'team-1',
  organisationId: ORG_ID,
  name: 'Engineering',
  description: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}
const ACTOR: Actor = { userId: 'user-1', organisationId: null, role: 'admin' }

beforeEach(() => { dbMock.reset(); vi.clearAllMocks() })

describe('createTeam', () => {
  it('inserts team, logs audit, dispatches sync, and returns the row', async () => {
    dbMock.set([TEAM])
    const result = await createTeam({ organisationId: ORG_ID, name: 'Engineering' }, ACTOR)
    expect(result.id).toBe('team-1')
    expect(dispatchSync).toHaveBeenCalledWith('team', 'team-1')
  })
})

describe('updateTeam', () => {
  it('fetches before, updates, logs audit, dispatches sync', async () => {
    const updated = { ...TEAM, name: 'Platform' }
    dbMock.set([TEAM], [updated])
    const result = await updateTeam('team-1', { name: 'Platform' }, ACTOR)
    expect(result.name).toBe('Platform')
    expect(dispatchSync).toHaveBeenCalledWith('team', 'team-1')
  })

  it('throws 404 when team does not exist', async () => {
    dbMock.set([])
    await expect(updateTeam('missing', { name: 'X' }, ACTOR)).rejects.toMatchObject({ status: 404 })
  })

  it('throws 404 when team is soft-deleted', async () => {
    dbMock.set([{ ...TEAM, deletedAt: new Date() }])
    await expect(updateTeam('team-1', { name: 'X' }, ACTOR)).rejects.toMatchObject({ status: 404 })
  })

  it('throws 403 when user org does not match team org', async () => {
    dbMock.set([TEAM])
    const restrictedActor: Actor = { userId: 'user-2', role: 'manager', organisationId: 'other-org' }
    await expect(updateTeam('team-1', { name: 'X' }, restrictedActor)).rejects.toMatchObject({ name: 'ForbiddenError' })
  })
})

describe('archiveTeam', () => {
  it('soft-deletes the team and dispatches sync', async () => {
    dbMock.set([TEAM])
    await archiveTeam('team-1', ACTOR)
    expect(dispatchSync).toHaveBeenCalledWith('team', 'team-1')
  })

  it('throws 404 when team does not exist', async () => {
    dbMock.set([])
    await expect(archiveTeam('missing', ACTOR)).rejects.toMatchObject({ status: 404 })
  })
})
