import type { FinancialTypeCategory } from "@/lib/db/schema";
import { formatCurrency } from "@/lib/utils";

export type BestellingConflictType =
  | "geen-financiering"
  | "over-geraamd"
  | "verkeerde-bron"
  | "concept-budget";

export interface BestellingConflict {
  type: BestellingConflictType;
  severity: "error" | "warning";
  message: string;
}

export interface BestellingConflictInput {
  bestelling: {
    id: string;
    geraamdBedrag: string | null | undefined;
  };
  allocations: Array<{
    id: string;
    amount: string | null | undefined;
    percentage: string | null | undefined;
    status: string;
  }>;
  sourceAmounts: Array<{
    id: string;
    status: "concept" | "released";
    financialType: { type: string; year: number } | null | undefined;
  }>;
}

export interface BestellingAllocationInput {
  geraamdBedrag: string | null | undefined;
  allocations: Array<{
    amount: string | null | undefined;
    status: string;
  }>;
}

export interface AllocationSummary {
  geraamd: number;
  toegewezen: number;
  beschikbaar: number;
}

export function isValidBestellingFinancialType(type: FinancialTypeCategory): boolean {
  return type === "MATEX" || type === "Investeringen";
}

export function calculateBestellingAllocation(input: BestellingAllocationInput): AllocationSummary {
  const geraamd = Number(input.geraamdBedrag ?? 0);
  const toegewezen = input.allocations
    .filter(a => a.status === "active")
    .reduce((sum, a) => sum + Number(a.amount ?? 0), 0);
  return { geraamd, toegewezen, beschikbaar: geraamd - toegewezen };
}

export function detectBestellingConflicts(input: BestellingConflictInput): BestellingConflict[] {
  const conflicts: BestellingConflict[] = [];
  const { bestelling, allocations, sourceAmounts } = input;

  const activeAllocations = allocations.filter(a => a.status === "active");
  const geraamd = Number(bestelling.geraamdBedrag ?? 0);
  const hasGeraamd = bestelling.geraamdBedrag != null;

  if (hasGeraamd && activeAllocations.length === 0) {
    conflicts.push({
      type: "geen-financiering",
      severity: "warning",
      message: "Bestelling heeft een geraamd bedrag maar geen actieve financiering.",
    });
  }

  if (activeAllocations.length > 0) {
    const toegewezen = activeAllocations.reduce((sum, a) => sum + Number(a.amount ?? 0), 0);
    if (hasGeraamd && toegewezen > geraamd) {
      conflicts.push({
        type: "over-geraamd",
        severity: "warning",
        message: `Gealloceerd bedrag (${formatCurrency(toegewezen)}) overschrijdt het geraamde bedrag (${formatCurrency(geraamd)}).`,
      });
    }
  }

  for (const sa of sourceAmounts) {
    if (sa.financialType && !isValidBestellingFinancialType(sa.financialType.type as FinancialTypeCategory)) {
      conflicts.push({
        type: "verkeerde-bron",
        severity: "error",
        message: `Bestellingen mogen niet gefinancierd worden uit ${sa.financialType.type}. Gebruik MATEX of Investeringen.`,
      });
    }

    if (sa.status === "concept" && activeAllocations.length > 0) {
      conflicts.push({
        type: "concept-budget",
        severity: "warning",
        message: "Bestelling is gefinancierd uit een conceptbedrag (nog niet vrijgegeven).",
      });
    }
  }

  return conflicts;
}
