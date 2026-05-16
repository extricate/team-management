import { db } from "@/lib/db";
import { fundingAllocations, financialSourceAmounts } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { evaluateSourceAmountConflicts, type FinancialConflict } from "@/lib/financial-conflicts";
import { FundingAllocationSchema, FundingAllocationUpdateSchema } from "@/lib/schemas";
import { eq } from "drizzle-orm";
import type { Actor } from "@/lib/api";
import type { z } from "zod";

function notFound(): Error {
  const e = new Error("Allocatie niet gevonden.");
  (e as Error & { status: number }).status = 404;
  return e;
}

function conflictError(message: string): Error {
  const e = new Error(message);
  (e as Error & { status: number }).status = 409;
  return e;
}

async function checkSourceAmountConflicts(
  financialSourceAmountId: string,
  extraAllocation: { amount: string | null | undefined; startDate: Date | null | undefined },
): Promise<FinancialConflict[]> {
  const sourceAmount = await db.query.financialSourceAmounts.findFirst({
    where: eq(financialSourceAmounts.id, financialSourceAmountId),
    with: {
      type: true,
      allocations: {
        with: { position: { columns: { expectedStart: true, expectedEnd: true } } },
      },
    },
  });
  if (!sourceAmount) return [];
  return evaluateSourceAmountConflicts(sourceAmount, extraAllocation);
}

export type CreateFundingAllocationResult = {
  row: typeof fundingAllocations.$inferSelect;
  warnings: FinancialConflict[];
};

export async function createFundingAllocation(
  data: z.infer<typeof FundingAllocationSchema>,
  actor: Actor,
): Promise<CreateFundingAllocationResult> {
  if (data.financialSourceAmountId) {
    const conflicts = await checkSourceAmountConflicts(data.financialSourceAmountId, {
      amount: data.amount,
      startDate: data.startDate,
    });
    const errors = conflicts.filter(c => c.severity === "error");
    if (errors.length > 0) throw conflictError(errors[0].message);
    const warnings = conflicts.filter(c => c.severity === "warning");

    const [row] = await db.insert(fundingAllocations).values({ ...data, createdBy: actor.userId }).returning();
    await logAudit({ actorUserId: actor.userId, entityType: "fundingAllocation", entityId: row.id, action: "assign", after: row, reason: data.reason });
    return { row, warnings };
  }

  const [row] = await db.insert(fundingAllocations).values({ ...data, createdBy: actor.userId }).returning();
  await logAudit({ actorUserId: actor.userId, entityType: "fundingAllocation", entityId: row.id, action: "assign", after: row, reason: data.reason });
  return { row, warnings: [] };
}

export async function updateFundingAllocation(
  id: string,
  data: z.infer<typeof FundingAllocationUpdateSchema>,
  actor: Actor,
) {
  const [before] = await db.select().from(fundingAllocations).where(eq(fundingAllocations.id, id));
  if (!before) throw notFound();

  if (before.financialSourceAmountId) {
    const conflicts = await checkSourceAmountConflicts(before.financialSourceAmountId, {
      amount: data.amount ?? before.amount,
      startDate: data.startDate !== undefined ? data.startDate : before.startDate,
    });
    const errors = conflicts.filter(c => c.severity === "error");
    if (errors.length > 0) throw conflictError(errors[0].message);
  }

  const [after] = await db.update(fundingAllocations).set({ ...data, updatedAt: new Date() }).where(eq(fundingAllocations.id, id)).returning();
  await logAudit({ actorUserId: actor.userId, entityType: "fundingAllocation", entityId: id, action: "update", before, after });
  return after;
}

export async function deleteFundingAllocation(id: string, actor: Actor) {
  const [before] = await db.select().from(fundingAllocations).where(eq(fundingAllocations.id, id));
  if (!before) throw notFound();

  await db.delete(fundingAllocations).where(eq(fundingAllocations.id, id));
  await logAudit({ actorUserId: actor.userId, entityType: "fundingAllocation", entityId: id, action: "delete", before });
}
