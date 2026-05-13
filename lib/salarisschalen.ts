import type { Salarisschaal } from '@/lib/db/schema'

export interface SchaalLookupResult {
  schaal: Salarisschaal | null
  isExact: boolean
  foundYear: number | null
}

export function calculateTotalCost(schaal: Salarisschaal): number {
  return (
    parseFloat(schaal.primaryCost) +
    parseFloat(schaal.secondaryEffects) +
    parseFloat(schaal.tertiaryEffects)
  )
}

export function findBestMatch(
  schalen: Salarisschaal[],
  schaalCode: string,
  year: number,
): SchaalLookupResult {
  const matching = schalen.filter(
    s => s.schaalCode.toLowerCase() === schaalCode.toLowerCase(),
  )

  if (matching.length === 0) return { schaal: null, isExact: false, foundYear: null }

  const exact = matching.find(s => s.year === year)
  if (exact) return { schaal: exact, isExact: true, foundYear: year }

  const closest = matching.reduce((best, current) => {
    const bestDiff = Math.abs(best.year - year)
    const currDiff = Math.abs(current.year - year)
    if (currDiff < bestDiff) return current
    if (currDiff === bestDiff && current.year < year) return current
    return best
  })

  return { schaal: closest, isExact: false, foundYear: closest.year }
}
