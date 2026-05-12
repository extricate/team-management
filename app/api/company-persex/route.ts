import { db } from "@/lib/db";
import { companyPersexBudgets, fundingAllocations } from "@/lib/db/schema";
import { ok, created, badRequest, requireAuth, withErrorHandling } from "@/lib/api";
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

export const POST = withErrorHandling(async (req: Request) => {
  const session = await requireAuth();
  const body = await req.json();
  const parsed = CompanyPersexBudgetSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  // Enforce uniqueness per year (the DB UNIQUE constraint will also catch this,
  // but a friendly message is better than a 500).
  const existing = await db.query.companyPersexBudgets.findFirst({
    where: eq(companyPersexBudgets.year, parsed.data.year),
  });
  if (existing) return badRequest(`Er bestaat al een bedrijfspersex-budget voor ${parsed.data.year}.`);

  const [row] = await db.insert(companyPersexBudgets).values(parsed.data).returning();
  await logAudit({ actorUserId: session.user?.id, entityType: "companyPersexBudget", entityId: row.id, action: "create", after: row });
  return created(row);
});
