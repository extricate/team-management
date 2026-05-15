import { db } from "@/lib/db";
import { financialSourceAmounts, financialSources } from "@/lib/db/schema";
import { created, badRequest, notFound, requireAuth, withErrorHandling } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { FinancialSourceAmountSchema } from "@/lib/schemas";
import { eq } from "drizzle-orm";

export const POST = withErrorHandling(async (req: Request) => {
  const session = await requireAuth();
  const body = await req.json();
  const parsed = FinancialSourceAmountSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const [source] = await db
    .select({ id: financialSources.id })
    .from(financialSources)
    .where(eq(financialSources.id, parsed.data.financialSourceId));
  if (!source) return notFound("Financieringsbron niet gevonden.");

  const [row] = await db.insert(financialSourceAmounts).values({
    financialSourceId: parsed.data.financialSourceId,
    financialTypeId: parsed.data.financialTypeId,
    amount: String(parsed.data.amount),
    status: parsed.data.status,
    effectiveDate: parsed.data.effectiveDate,
    releaseDate: parsed.data.releaseDate,
  }).returning();

  await logAudit({
    actorUserId: session.user?.id,
    entityType: "financialSource",
    entityId: parsed.data.financialSourceId,
    action: "create",
    after: row,
  });

  return created(row);
});
