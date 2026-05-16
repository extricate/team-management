import { z } from "zod";
import { db } from "@/lib/db";
import { financialTypes, financialSources } from "@/lib/db/schema";
import { created, notFound, withMutation } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { eq } from "drizzle-orm";

const Schema = z.object({
  financialSourceId: z.string().uuid(),
  type: z.enum(["PERSEX", "MATEX", "Investeringen"]),
  year: z.number().int().min(2000).max(2099),
});

export const POST = withMutation(Schema, async ({ session, data }) => {
  const [source] = await db
    .select({ id: financialSources.id })
    .from(financialSources)
    .where(eq(financialSources.id, data.financialSourceId));
  if (!source) return notFound("Financieringsbron niet gevonden.");

  const [row] = await db.insert(financialTypes).values(data).returning();

  await logAudit({
    actorUserId: session.user?.id,
    entityType: "financialSource",
    entityId: data.financialSourceId,
    action: "update",
    after: row,
  });

  return created(row);
});
