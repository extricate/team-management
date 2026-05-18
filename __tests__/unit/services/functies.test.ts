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

import { createFunctie, updateFunctie, archiveFunctie, deactivateFunctie, getActiveFuncties } from '@/lib/services/functies'
import { NIET_BESCHIKBAAR_TITEL } from '@/lib/functies'

const ACTOR = { userId: 'user-1', organisationId: null, role: 'admin' as const }

function makeFunctie(overrides: Record<string, unknown> = {}) {
  return {
    id: 'functie-1',
    titel: 'Product Owner',
    schaalCode: '12',
    isActive: true,
    deletedAt: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  }
}

beforeEach(() => { dbMock.reset(); vi.clearAllMocks() })

// ── createFunctie ──────────────────────────────────────────────────────────────

describe('createFunctie', () => {
  it('creates a functie and returns the row', async () => {
    const functie = makeFunctie()
    dbMock.set([functie])
    const row = await createFunctie({ titel: 'Product Owner', schaalCode: '12', isActive: true }, ACTOR)
    expect(row.id).toBe('functie-1')
    expect(row.titel).toBe('Product Owner')
  })

  it('throws 409 on duplicate titel', async () => {
    const err = Object.assign(new Error('duplicate'), { code: '23505' })
    dbMock.set(Promise.reject(err))
    await expect(createFunctie({ titel: 'Product Owner', schaalCode: null, isActive: true }, ACTOR))
      .rejects.toMatchObject({ status: 409 })
  })
})

// ── updateFunctie ──────────────────────────────────────────────────────────────

describe('updateFunctie', () => {
  it('updates and returns the updated row', async () => {
    const before = makeFunctie()
    const after = makeFunctie({ titel: 'Scrum Master' })
    dbMock.set([before], [after])
    const row = await updateFunctie('functie-1', { titel: 'Scrum Master' }, ACTOR)
    expect(row.titel).toBe('Scrum Master')
  })

  it('throws 404 when functie does not exist', async () => {
    dbMock.set([])
    await expect(updateFunctie('missing', { titel: 'X' }, ACTOR)).rejects.toMatchObject({ status: 404 })
  })

  it('throws 404 when functie is archived', async () => {
    dbMock.set([makeFunctie({ deletedAt: new Date() })])
    await expect(updateFunctie('functie-1', { titel: 'X' }, ACTOR)).rejects.toMatchObject({ status: 404 })
  })

  it('throws 409 on titel duplicate during update', async () => {
    const before = makeFunctie()
    const err = Object.assign(new Error('duplicate'), { code: '23505' })
    dbMock.set([before], Promise.reject(err))
    await expect(updateFunctie('functie-1', { titel: 'Existing' }, ACTOR)).rejects.toMatchObject({ status: 409 })
  })
})

// ── archiveFunctie ─────────────────────────────────────────────────────────────

describe('archiveFunctie', () => {
  it('archives a regular functie', async () => {
    dbMock.set([makeFunctie()])
    await expect(archiveFunctie('functie-1', ACTOR)).resolves.toBeUndefined()
  })

  it('throws 404 when functie does not exist', async () => {
    dbMock.set([])
    await expect(archiveFunctie('missing', ACTOR)).rejects.toMatchObject({ status: 404 })
  })

  it('throws 403 when trying to archive the "Niet beschikbaar" sentinel', async () => {
    dbMock.set([makeFunctie({ titel: NIET_BESCHIKBAAR_TITEL })])
    await expect(archiveFunctie('functie-1', ACTOR)).rejects.toMatchObject({ status: 403 })
  })
})

// ── deactivateFunctie ──────────────────────────────────────────────────────────

describe('deactivateFunctie', () => {
  it('sets isActive to false', async () => {
    dbMock.set([makeFunctie()])
    await expect(deactivateFunctie('functie-1', ACTOR)).resolves.toBeUndefined()
  })

  it('throws 404 when functie does not exist', async () => {
    dbMock.set([])
    await expect(deactivateFunctie('missing', ACTOR)).rejects.toMatchObject({ status: 404 })
  })

  it('throws 403 when trying to deactivate the "Niet beschikbaar" sentinel', async () => {
    dbMock.set([makeFunctie({ titel: NIET_BESCHIKBAAR_TITEL })])
    await expect(deactivateFunctie('functie-1', ACTOR)).rejects.toMatchObject({ status: 403 })
  })
})

// ── getActiveFuncties ──────────────────────────────────────────────────────────

describe('getActiveFuncties', () => {
  it('returns a list of active functies', async () => {
    dbMock.set([makeFunctie(), makeFunctie({ id: 'functie-2', titel: 'Scrum Master' })])
    const rows = await getActiveFuncties()
    expect(rows).toHaveLength(2)
  })

  it('returns empty array when no active functies exist', async () => {
    dbMock.set([])
    const rows = await getActiveFuncties()
    expect(rows).toHaveLength(0)
  })
})
