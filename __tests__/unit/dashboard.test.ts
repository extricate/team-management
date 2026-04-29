import { describe, it, expect } from 'vitest'
import { detectPositionConflicts, collectUpcomingEvents } from '@/lib/dashboard'
import type { PositionStatus } from '@/lib/db/schema'

const TEAM = { name: 'Alpha Team' }

function makePosition(overrides: Partial<{
  id: string
  type: string
  teamId: string
  status: PositionStatus
  expectedStart: Date | null
  expectedEnd: Date | null
  requiredBefore: Date | null
  fundingAllocations: Array<{ status: string }>
}> = {}) {
  return {
    id: overrides.id ?? 'pos-1',
    type: overrides.type ?? 'Product Owner',
    teamId: overrides.teamId ?? 'team-1',
    status: overrides.status ?? 'planned',
    expectedStart: overrides.expectedStart ?? null,
    expectedEnd: overrides.expectedEnd ?? null,
    requiredBefore: overrides.requiredBefore ?? null,
    fundingAllocations: overrides.fundingAllocations ?? [],
    team: TEAM,
  }
}

// ── detectPositionConflicts ────────────────────────────────────────────────────

describe('detectPositionConflicts', () => {
  it('returns empty array when no positions', () => {
    expect(detectPositionConflicts([])).toEqual([])
  })

  it('flags a late-start conflict when expectedStart > requiredBefore', () => {
    const pos = makePosition({
      status: 'planned',
      requiredBefore: new Date('2025-06-01'),
      expectedStart: new Date('2025-09-01'),
    })
    const conflicts = detectPositionConflicts([pos])
    expect(conflicts).toHaveLength(2) // late_start + unfunded
    expect(conflicts.some(c => c.type === 'late_start')).toBe(true)
  })

  it('does NOT flag late-start when expectedStart <= requiredBefore', () => {
    const pos = makePosition({
      status: 'planned',
      requiredBefore: new Date('2025-09-01'),
      expectedStart: new Date('2025-06-01'),
    })
    const conflicts = detectPositionConflicts([pos])
    // Only unfunded, not late_start
    expect(conflicts.every(c => c.type !== 'late_start')).toBe(true)
  })

  it('does NOT flag late-start when requiredBefore is null', () => {
    const pos = makePosition({
      status: 'open',
      requiredBefore: null,
      expectedStart: new Date('2025-09-01'),
      fundingAllocations: [{ status: 'active' }],
    })
    expect(detectPositionConflicts([pos])).toHaveLength(0)
  })

  it('flags unfunded for planned position with no active allocations', () => {
    const pos = makePosition({
      status: 'planned',
      fundingAllocations: [],
    })
    const conflicts = detectPositionConflicts([pos])
    expect(conflicts.some(c => c.type === 'unfunded')).toBe(true)
  })

  it('flags unfunded for open position with no active allocations', () => {
    const pos = makePosition({
      status: 'open',
      fundingAllocations: [{ status: 'expired' }],
    })
    const conflicts = detectPositionConflicts([pos])
    expect(conflicts.some(c => c.type === 'unfunded')).toBe(true)
  })

  it('does NOT flag unfunded when there is an active allocation', () => {
    const pos = makePosition({
      status: 'open',
      fundingAllocations: [{ status: 'active' }],
    })
    const conflicts = detectPositionConflicts([pos])
    expect(conflicts.every(c => c.type !== 'unfunded')).toBe(true)
  })

  it('does NOT flag unfunded for filled positions', () => {
    const pos = makePosition({
      status: 'filled',
      fundingAllocations: [],
    })
    expect(detectPositionConflicts([pos])).toHaveLength(0)
  })

  it('skips closed positions entirely', () => {
    const pos = makePosition({
      status: 'closed',
      requiredBefore: new Date('2025-01-01'),
      expectedStart: new Date('2025-12-01'),
      fundingAllocations: [],
    })
    expect(detectPositionConflicts([pos])).toHaveLength(0)
  })

  it('returns the correct teamName and positionType in the conflict', () => {
    const pos = makePosition({
      type: 'Scrum Master',
      status: 'planned',
      requiredBefore: new Date('2025-06-01'),
      expectedStart: new Date('2025-09-01'),
    })
    const conflicts = detectPositionConflicts([pos])
    const lateConflict = conflicts.find(c => c.type === 'late_start')!
    expect(lateConflict.positionType).toBe('Scrum Master')
    expect(lateConflict.teamName).toBe('Alpha Team')
  })
})

// ── collectUpcomingEvents ──────────────────────────────────────────────────────

describe('collectUpcomingEvents', () => {
  const now = new Date('2025-06-01T12:00:00Z')

  function daysFromNow(days: number) {
    return new Date(now.getTime() + days * 86_400_000)
  }

  it('returns empty when no events', () => {
    expect(collectUpcomingEvents([], [], [], now)).toHaveLength(0)
  })

  it('includes position starting within the window', () => {
    const pos = makePosition({
      status: 'planned',
      expectedStart: daysFromNow(30),
      fundingAllocations: [{ status: 'active' }],
    })
    const events = collectUpcomingEvents([pos], [], [], now, 0, 90)
    expect(events.some(e => e.kind === 'position_start')).toBe(true)
  })

  it('includes position ending within the window', () => {
    const pos = makePosition({
      status: 'filled',
      expectedEnd: daysFromNow(60),
      fundingAllocations: [{ status: 'active' }],
    })
    const events = collectUpcomingEvents([pos], [], [], now, 0, 90)
    expect(events.some(e => e.kind === 'position_end')).toBe(true)
  })

  it('excludes events outside the window', () => {
    const pos = makePosition({
      status: 'planned',
      expectedStart: daysFromNow(120),
    })
    expect(collectUpcomingEvents([pos], [], [], now, 0, 90)).toHaveLength(0)
  })

  it('includes membership ending within the window', () => {
    const membership = {
      id: 'm-1',
      status: 'active' as const,
      endDate: daysFromNow(14),
      employee: { firstName: 'Jan', prefixName: null, lastName: 'Jansen' },
      team: { name: 'Alpha Team' },
    }
    const events = collectUpcomingEvents([], [membership], [], now, 0, 90)
    expect(events.some(e => e.kind === 'membership_end')).toBe(true)
  })

  it('excludes ended memberships', () => {
    const membership = {
      id: 'm-2',
      status: 'ended' as const,
      endDate: daysFromNow(14),
      employee: { firstName: 'Jan', prefixName: null, lastName: 'Jansen' },
      team: { name: 'Alpha Team' },
    }
    expect(collectUpcomingEvents([], [membership], [], now, 0, 90)).toHaveLength(0)
  })

  it('sorts events chronologically', () => {
    const pos1 = makePosition({ id: 'p1', status: 'planned', expectedStart: daysFromNow(60), fundingAllocations: [{ status: 'active' }] })
    const pos2 = makePosition({ id: 'p2', status: 'planned', expectedStart: daysFromNow(10), fundingAllocations: [{ status: 'active' }] })
    const events = collectUpcomingEvents([pos1, pos2], [], [], now, 0, 90)
    expect(events[0].daysUntil).toBeLessThan(events[1].daysUntil)
  })

  it('calculates daysUntil correctly', () => {
    const pos = makePosition({
      status: 'planned',
      expectedStart: daysFromNow(7),
      fundingAllocations: [{ status: 'active' }],
    })
    const events = collectUpcomingEvents([pos], [], [], now, 0, 90)
    expect(events[0].daysUntil).toBe(7)
  })

  it('excludes closed positions', () => {
    const pos = makePosition({
      status: 'closed',
      expectedStart: daysFromNow(5),
    })
    expect(collectUpcomingEvents([pos], [], [], now, 0, 90)).toHaveLength(0)
  })
})
