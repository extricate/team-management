import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockValues = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const mockInsert = vi.hoisted(() => vi.fn().mockReturnValue({ values: mockValues }))

vi.mock('@/lib/db', () => ({ db: { insert: mockInsert } }))

import { logAudit } from '@/lib/audit'

beforeEach(() => {
  mockInsert.mockClear()
  mockValues.mockClear()
})

describe('logAudit', () => {
  it('inserts an audit event with all provided fields', async () => {
    await logAudit({
      actorUserId: 'user-1',
      entityType: 'organisation',
      entityId: 'org-1',
      action: 'create',
      after: { id: 'org-1', name: 'Test Org' },
    })

    expect(mockInsert).toHaveBeenCalledTimes(1)
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'user-1',
        entityType: 'organisation',
        entityId: 'org-1',
        action: 'create',
        afterJson: { id: 'org-1', name: 'Test Org' },
        beforeJson: null,
      })
    )
  })

  it('sets beforeJson and afterJson to null when omitted', async () => {
    await logAudit({ entityType: 'team', entityId: 'team-1', action: 'update' })

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ beforeJson: null, afterJson: null })
    )
  })

  it('stores the reason when provided', async () => {
    await logAudit({
      entityType: 'position',
      entityId: 'pos-1',
      action: 'reallocate',
      reason: 'Budget transferred to another team',
    })

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'Budget transferred to another team' })
    )
  })
})
