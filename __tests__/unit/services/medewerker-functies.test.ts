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

import { assignFunctie, endFunctie, setPrimary } from '@/lib/services/medewerker-functies'

const ACTOR = { userId: 'user-1' }
const EMP_ID = 'emp-1'
const FUNCTIE_ID = 'functie-1'
const START = new Date('2025-01-01')

function makeAssignment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'mf-1',
    employeeId: EMP_ID,
    functieId: FUNCTIE_ID,
    isPrimary: false,
    startDate: START,
    endDate: null,
    status: 'active',
    reason: null,
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

beforeEach(() => { dbMock.reset(); vi.clearAllMocks() })

// ── assignFunctie ──────────────────────────────────────────────────────────────

describe('assignFunctie', () => {
  it('creates a non-primary assignment', async () => {
    // isPrimary=false → no preliminary query, just the INSERT
    dbMock.set([makeAssignment()])
    const row = await assignFunctie(EMP_ID, FUNCTIE_ID, START, false, ACTOR)
    expect(row.employeeId).toBe(EMP_ID)
    expect(row.isPrimary).toBe(false)
  })

  it('creates a primary assignment and clears previous primary', async () => {
    const existingPrimary = makeAssignment({ id: 'mf-old', isPrimary: true })
    // first query: find existing primary; second: update old; third: insert new
    dbMock.set([existingPrimary], [], [makeAssignment({ isPrimary: true })])
    const row = await assignFunctie(EMP_ID, FUNCTIE_ID, START, true, ACTOR)
    expect(row.isPrimary).toBe(true)
  })

  it('creates a primary assignment with no prior primary (empty list)', async () => {
    dbMock.set([], [makeAssignment({ isPrimary: true })])
    const row = await assignFunctie(EMP_ID, FUNCTIE_ID, START, true, ACTOR)
    expect(row.isPrimary).toBe(true)
  })

  it('throws 409 on duplicate employee+functie combination', async () => {
    const err = Object.assign(new Error('duplicate'), { code: '23505' })
    // isPrimary=false → INSERT is the first (and only) DB call
    dbMock.set(Promise.reject(err))
    await expect(assignFunctie(EMP_ID, FUNCTIE_ID, START, false, ACTOR)).rejects.toMatchObject({ status: 409 })
  })
})

// ── endFunctie ─────────────────────────────────────────────────────────────────

describe('endFunctie', () => {
  it('ends an active assignment', async () => {
    dbMock.set([makeAssignment()])
    await expect(endFunctie('mf-1', 'Functieverandering', ACTOR)).resolves.toBeUndefined()
  })

  it('throws 404 when assignment does not exist', async () => {
    dbMock.set([])
    await expect(endFunctie('missing', null, ACTOR)).rejects.toMatchObject({ status: 404 })
  })

  it('throws 404 when assignment is already ended', async () => {
    dbMock.set([makeAssignment({ status: 'ended', endDate: new Date() })])
    await expect(endFunctie('mf-1', null, ACTOR)).rejects.toMatchObject({ status: 404 })
  })
})

// ── setPrimary ─────────────────────────────────────────────────────────────────

describe('setPrimary', () => {
  it('sets assignment as primary and clears old primary', async () => {
    const oldPrimary = makeAssignment({ id: 'mf-old', isPrimary: true })
    const target = makeAssignment({ id: 'mf-target', isPrimary: false })
    dbMock.set([target], [oldPrimary], [])
    await expect(setPrimary('mf-target', ACTOR)).resolves.toBeUndefined()
  })

  it('throws 404 when assignment does not exist', async () => {
    dbMock.set([])
    await expect(setPrimary('missing', ACTOR)).rejects.toMatchObject({ status: 404 })
  })
})
