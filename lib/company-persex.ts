import { formatCurrency } from "@/lib/utils";
import { calcUtilizationPercent, type FinancialConflict } from "@/lib/financial-conflicts";

export interface CompanyPersexBudget {
  id: string;
  year: number;
  amount: number | string;
  status: "concept" | "released";
  allocations: Array<{ status: string; amount: number | string | null }>;
}

export interface CompanyPersexSummary {
  totalBudget: number;
  totalAllocated: number;
  utilizationPercent: number;
  conflicts: FinancialConflict[];
}

export function summarizeCompanyPersex(budgets: CompanyPersexBudget[]): CompanyPersexSummary {
  const totalBudget = budgets.reduce((s, b) => s + Number(b.amount), 0);
  const totalAllocated = budgets.reduce((s, b) => {
    return s + b.allocations
      .filter(a => a.status === "active")
      .reduce((bs, a) => bs + Number(a.amount ?? 0), 0);
  }, 0);

  const utilizationPercent = calcUtilizationPercent(totalAllocated, totalBudget);

  const conflicts: FinancialConflict[] = [];
  if (totalBudget > 0 && totalAllocated > totalBudget) {
    conflicts.push({
      severity: "warning",
      message: `Bedrijfspersex ${utilizationPercent}% benut (${formatCurrency(totalAllocated)} van ${formatCurrency(totalBudget)}). Maximum overschreden — dit is toegestaan.`,
    });
  }

  return { totalBudget, totalAllocated, utilizationPercent, conflicts };
}
