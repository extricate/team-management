import { db } from "@/lib/db";
import { companyPersexBudgets, fundingAllocations } from "@/lib/db/schema";
import { ok, created, badRequest, withMutation, withErrorHandling, requireAuth } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { CompanyPersexBudgetSchema } from "@/lib/schemas";
import { eq } from "drizzle-orm";

export const GET = withErrorHandling(async () => {
  await requireAuth();
  const rows = await db.query.companyPersexBudgets.findMany({
    with: { allocations: { where: eq(fundingAllocations.status, "active") } },
    orderBy: (b, { asc }) => [asc(b.year)],
  });
  return ok(rows);
});

export const POST = withMutation(CompanyPersexBudgetSchema, async ({ session, data }) => {
  const existing = await db.query.companyPersexBudgets.findFirst({
    where: eq(companyPersexBudgets.year, data.year),
  });
  if (existing) return badRequest(`Er bestaat al een bedrijfspersex-budget voor ${data.year}.`);

  const [row] = await db.insert(companyPersexBudgets).values({ ...data, amount: String(data.amount) }).returning();
  await logAudit({ actorUserId: session.user?.id, entityType: "companyPersexBudget", entityId: row.id, action: "create", after: row });
  return created(row);
});
