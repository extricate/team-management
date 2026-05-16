import { db } from "@/lib/db";
import { financialSourceAmounts, financialSources } from "@/lib/db/schema";
import { created, notFound, withMutation } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { FinancialSourceAmountSchema } from "@/lib/schemas";
import { eq } from "drizzle-orm";

export const POST = withMutation(FinancialSourceAmountSchema, async ({ session, data }) => {
  const [source] = await db
    .select({ id: financialSources.id })
    .from(financialSources)
    .where(eq(financialSources.id, data.financialSourceId));
  if (!source) return notFound("Financieringsbron niet gevonden.");

  const [row] = await db.insert(financialSourceAmounts).values({
    financialSourceId: data.financialSourceId,
    financialTypeId: data.financialTypeId,
    amount: String(data.amount),
    status: data.status,
    effectiveDate: data.effectiveDate,
    releaseDate: data.releaseDate,
  }).returning();

  await logAudit({
    actorUserId: session.user?.id,
    entityType: "financialSource",
    entityId: data.financialSourceId,
    action: "create",
    after: row,
  });

  return created(row);
});
