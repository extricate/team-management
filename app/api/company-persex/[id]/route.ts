import { db } from "@/lib/db";
import { companyPersexBudgets } from "@/lib/db/schema";
import { ok, notFound, badRequest, requireAuth, withErrorHandling, RouteContext } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { CompanyPersexBudgetUpdateSchema } from "@/lib/schemas";
import { eq } from "drizzle-orm";

export const PATCH = withErrorHandling(async (req: Request, ctx: RouteContext) => {
  const session = await requireAuth();
  const { id } = await ctx.params;

  const [before] = await db.select().from(companyPersexBudgets).where(eq(companyPersexBudgets.id, id));
  if (!before) return notFound();

  const body = await req.json();
  const parsed = CompanyPersexBudgetUpdateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const [after] = await db.update(companyPersexBudgets)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(companyPersexBudgets.id, id))
    .returning();

  await logAudit({ actorUserId: session.user?.id, entityType: "companyPersexBudget", entityId: id, action: "update", before, after });
  return ok(after);
});
