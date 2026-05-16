import { db } from "@/lib/db";
import { companyPersexBudgets } from "@/lib/db/schema";
import { ok, notFound, withMutation } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { CompanyPersexBudgetUpdateSchema } from "@/lib/schemas";
import { eq } from "drizzle-orm";

export const PATCH = withMutation(CompanyPersexBudgetUpdateSchema, async ({ session, data, ctx }) => {
  const { id } = await ctx.params;

  const [before] = await db.select().from(companyPersexBudgets).where(eq(companyPersexBudgets.id, id));
  if (!before) return notFound();

  const { amount, ...rest } = data;
  const [after] = await db.update(companyPersexBudgets)
    .set({ ...rest, ...(amount != null ? { amount: String(amount) } : {}), updatedAt: new Date() })
    .where(eq(companyPersexBudgets.id, id))
    .returning();

  await logAudit({ actorUserId: session.user?.id, entityType: "companyPersexBudget", entityId: id, action: "update", before, after });
  return ok(after);
});
