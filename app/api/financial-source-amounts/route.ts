import { z } from "zod";
import { db } from "@/lib/db";
import { financialSourceAmounts, financialSources } from "@/lib/db/schema";
import { ok, created, badRequest, notFound, requireAuth, withErrorHandling } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { eq, isNull } from "drizzle-orm";

const Schema = z.object({
  financialSourceId: z.string().uuid(),
  financialTypeId: z.string().uuid(),
  amount: z.number().positive(),
  status: z.enum(["concept", "released"]).default("concept"),
  effectiveDate: z.string().datetime().optional(),
  releaseDate: z.string().datetime().optional(),
});

export const POST = withErrorHandling(async (req: Request) => {
  const session = await requireAuth();
  const body = await req.json();
  const parsed = Schema.safeParse(body);
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
    effectiveDate: parsed.data.effectiveDate ? new Date(parsed.data.effectiveDate) : undefined,
    releaseDate: parsed.data.releaseDate ? new Date(parsed.data.releaseDate) : undefined,
  }).returning();

  await logAudit({
    actorUserId: session.user?.id,
    entityType: "financialSource",
    entityId: parsed.data.financialSourceId,
    action: "create",
    after: row as Record<string, unknown>,
  });

  return created(row);
});
