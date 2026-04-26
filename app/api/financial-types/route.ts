import { z } from "zod";
import { db } from "@/lib/db";
import { financialTypes, financialSources } from "@/lib/db/schema";
import { ok, created, badRequest, notFound, requireAuth, withErrorHandling } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { eq, isNull } from "drizzle-orm";

const Schema = z.object({
  financialSourceId: z.string().uuid(),
  type: z.enum(["PERSEX", "MATEX", "Investeringen"]),
  year: z.number().int().min(2000).max(2099),
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

  const [row] = await db.insert(financialTypes).values(parsed.data).returning();

  await logAudit({
    actorUserId: session.user?.id,
    entityType: "financialSource",
    entityId: parsed.data.financialSourceId,
    action: "update",
    after: row as Record<string, unknown>,
  });

  return created(row);
});
