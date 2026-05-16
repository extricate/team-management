import { formatCurrency, formatDate, prorateCost } from "@/lib/utils";

export interface FinancialConflict {
  severity: "error" | "warning";
  message: string;
}

export interface ConflictAmount {
  amount: string | number;
  status: "concept" | "released";
  releaseDate: Date | null | undefined;
  type: { type: string; year: number } | null | undefined;
  allocations: Array<{
    status: string;
    amount: string | number | null;
    startDate: Date | null | undefined;
    position?: {
      expectedStart: Date | null | undefined;
      expectedEnd: Date | null | undefined;
    } | null;
  }>;
}

export function calcUtilizationPercent(allocated: number, budget: number): number {
  if (budget === 0) return 0;
  return Math.round((allocated / budget) * 100);
}

function effectiveAllocationAmount(
  al: ConflictAmount["allocations"][number],
  year: number | undefined,
): number {
  const raw = Number(al.amount ?? 0);
  if (!year || !al.position?.expectedStart) return raw;
  return prorateCost(raw, al.position.expectedStart, al.position.expectedEnd ?? null, year);
}

// The shape returned by the financialSourceAmounts DB query in the funding-allocations service.
// Defined here so tests can construct it without touching the DB.
export interface SourceAmountWithAllocations {
  amount: string | number;
  status: "concept" | "released";
  releaseDate: Date | null | undefined;
  type: { type: string; year: number } | null | undefined;
  allocations: Array<{
    status: string;
    amount: string | number | null;
    startDate: Date | null | undefined;
    position?: { expectedStart: Date | null | undefined; expectedEnd: Date | null | undefined } | null;
  }>;
}

// Pure function — no DB access. Builds a ConflictAmount from a pre-fetched source amount and the
// proposed extra allocation, then runs detectFinancialConflicts. Testable without mocks.
export function evaluateSourceAmountConflicts(
  sourceAmount: SourceAmountWithAllocations,
  extraAllocation: { amount: string | null | undefined; startDate: Date | null | undefined },
): FinancialConflict[] {
  return detectFinancialConflicts([{
    amount: sourceAmount.amount,
    status: sourceAmount.status,
    releaseDate: sourceAmount.releaseDate,
    type: sourceAmount.type ? { type: sourceAmount.type.type, year: sourceAmount.type.year } : null,
    allocations: [
      ...sourceAmount.allocations.map(al => ({
        status: al.status,
        amount: al.amount,
        startDate: al.startDate,
        position: al.position ? { expectedStart: al.position.expectedStart, expectedEnd: al.position.expectedEnd } : null,
      })),
      { status: "active", amount: extraAllocation.amount ?? null, startDate: extraAllocation.startDate ?? null },
    ],
  }]);
}

export function detectFinancialConflicts(amounts: ConflictAmount[]): FinancialConflict[] {
  const conflicts: FinancialConflict[] = [];

  for (const amount of amounts) {
    const year = amount.type?.year;
    const activeAllocs = amount.allocations.filter(al => al.status === "active");
    const totalAllocated = activeAllocs.reduce((s, al) => s + effectiveAllocationAmount(al, year), 0);
    const amountVal = Number(amount.amount);
    const label = amount.type
      ? `${amount.type.type} ${amount.type.year}`
      : "Ongetypeerd bedrag";

    if (activeAllocs.length > 0 && totalAllocated > amountVal) {
      const over = totalAllocated - amountVal;
      conflicts.push({
        severity: "error",
        message: `${label}: gealloceerd (${formatCurrency(totalAllocated)}) overschrijdt het bedrag (${formatCurrency(amountVal)}) met ${formatCurrency(over)}.`,
      });
    }

    if (amount.status === "concept" && activeAllocs.length > 0) {
      conflicts.push({
        severity: "warning",
        message: `${label}: ${activeAllocs.length} actieve allocatie(s) zijn gekoppeld aan een conceptbedrag (nog niet vrijgegeven).`,
      });
    }

    if (amount.releaseDate) {
      for (const al of activeAllocs) {
        if (al.startDate && al.startDate < amount.releaseDate) {
          conflicts.push({
            severity: "warning",
            message: `${label}: allocatie start op ${formatDate(al.startDate)}, vóór de vrijgavedatum van ${formatDate(amount.releaseDate)}.`,
          });
          break; // one warning per amount is enough
        }
      }
    }
  }

  return conflicts;
}
