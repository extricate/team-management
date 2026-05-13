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

import { createFundingAllocation, deleteFundingAllocation } from '@/lib/services/funding-allocations'

const FSA_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const POSITION_ID = 'b1b2c3d4-e5f6-7890-abcd-ef1234567891'

const ALLOCATION = {
  id: 'alloc-1',
  financialSourceAmountId: FSA_ID,
  positionId: POSITION_ID,
  teamId: null,
  amount: '50000',
  percentage: null,
  startDate: null,
  endDate: null,
  status: 'active',
  reason: null,
  createdBy: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
}

function makeSourceAmount(overrides: Record<string, unknown> = {}) {
  return {
    id: FSA_ID,
    amount: '200000',
    status: 'released',
    releaseDate: null,
    type: { type: 'PERSEX', year: 2025 },
    allocations: [],
    ...overrides,
  }
}

beforeEach(() => { dbMock.reset(); vi.clearAllMocks() })

describe('createFundingAllocation', () => {
  it('creates allocation and returns row with empty warnings when budget is sufficient', async () => {
    dbMock.set(makeSourceAmount(), [ALLOCATION])
    const { row, warnings } = await createFundingAllocation({
      financialSourceAmountId: FSA_ID,
      positionId: POSITION_ID,
      amount: '50000',
    }, 'user-1')
    expect(row.id).toBe('alloc-1')
    expect(warnings).toHaveLength(0)
  })

  it('throws 409 when new allocation would over-allocate the source amount', async () => {
    dbMock.set(makeSourceAmount({
      amount: '10000',
      allocations: [{ status: 'active', amount: '9000', startDate: null, position: null }],
    }))
    await expect(
      createFundingAllocation({ financialSourceAmountId: FSA_ID, positionId: POSITION_ID, amount: '5000' }, 'user-1')
    ).rejects.toMatchObject({ status: 409 })
  })

  it('returns warnings (but still creates) when concept amount has active allocations', async () => {
    dbMock.set(makeSourceAmount({ status: 'concept' }), [ALLOCATION])
    const { row, warnings } = await createFundingAllocation({
      financialSourceAmountId: FSA_ID,
      positionId: POSITION_ID,
      amount: '50000',
    }, 'user-1')
    expect(row.id).toBe('alloc-1')
    expect(warnings.some(w => w.severity === 'warning')).toBe(true)
  })

  it('skips conflict check when using companyPersexBudgetId instead of financialSourceAmountId', async () => {
    const COMPANY_BUDGET_ID = 'c1b2c3d4-e5f6-7890-abcd-ef1234567893'
    dbMock.set([{ ...ALLOCATION, financialSourceAmountId: null, companyPersexBudgetId: COMPANY_BUDGET_ID }])
    const { row } = await createFundingAllocation({
      companyPersexBudgetId: COMPANY_BUDGET_ID,
      positionId: POSITION_ID,
      amount: '50000',
    }, 'user-1')
    expect(row.id).toBe('alloc-1')
  })
})

describe('deleteFundingAllocation', () => {
  it('deletes the allocation', async () => {
    dbMock.set([ALLOCATION])
    await expect(deleteFundingAllocation('alloc-1', 'user-1')).resolves.toBeUndefined()
  })

  it('throws 404 when allocation does not exist', async () => {
    dbMock.set([])
    await expect(deleteFundingAllocation('missing', 'user-1')).rejects.toMatchObject({ status: 404 })
  })
})
