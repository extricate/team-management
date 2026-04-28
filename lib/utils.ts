type EmployeeName = { firstName: string; lastName: string; prefixName?: string | null };

export function formatFullName({ firstName, prefixName, lastName }: EmployeeName): string {
  return prefixName
    ? `${firstName} ${prefixName} ${lastName}`
    : `${firstName} ${lastName}`;
}

export function formatCurrency(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(
    Number(value)
  );
}

export function formatCompactCurrency(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const num = Number(value);
  if (isNaN(num)) return "—";
  const abs = Math.abs(num);
  if (abs >= 1_000_000) {
    const mln = num / 1_000_000;
    const decimals = abs >= 10_000_000 ? 1 : 2;
    return `€ ${mln.toLocaleString("nl-NL", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}M`;
  }
  if (abs >= 100_000) {
    return `€ ${Math.round(num / 1_000).toLocaleString("nl-NL")}k`;
  }
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(num);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("nl-NL");
}

/**
 * Calculates the effective cost for a position in a given year, prorated by
 * how many days of that year the position is active (based on expectedStart/expectedEnd).
 * Returns the full annualCost when the position is active the whole year.
 */
export function prorateCost(
  annualCost: number,
  expectedStart: Date | null | undefined,
  expectedEnd: Date | null | undefined,
  year: number,
): number {
  if (annualCost <= 0) return 0;

  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);

  if (expectedStart && expectedStart > yearEnd) return 0;
  if (expectedEnd && expectedEnd < yearStart) return 0;

  const activeFrom = expectedStart && expectedStart > yearStart ? expectedStart : yearStart;
  const activeTo = expectedEnd && expectedEnd < yearEnd ? expectedEnd : yearEnd;

  if (activeFrom > activeTo) return 0;

  const totalDaysInYear = Math.round(
    (new Date(year + 1, 0, 1).getTime() - new Date(year, 0, 1).getTime()) / 86400000,
  );
  const activeDays =
    Math.round((activeTo.getTime() - activeFrom.getTime()) / 86400000) + 1;

  if (activeDays >= totalDaysInYear) return annualCost;
  return annualCost * (activeDays / totalDaysInYear);
}
