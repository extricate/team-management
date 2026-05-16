import { db } from "@/lib/db";
import { bestellingen } from "@/lib/db/schema";
import { ok, created, withMutation, withErrorHandling, requireAuth } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { BestellingSchema } from "@/lib/schemas";
import { isNull } from "drizzle-orm";

export const GET = withErrorHandling(async () => {
  await requireAuth();
  const rows = await db.query.bestellingen.findMany({
    where: isNull(bestellingen.deletedAt),
    with: {
      type: true,
      organisation: true,
      fundingAllocations: {
        with: { financialSourceAmount: { with: { financialSource: true, type: true } } },
      },
      positions: true,
    },
  });
  return ok(rows);
});

export const POST = withMutation(BestellingSchema, async ({ session, data }) => {
  const insertData = {
    ...data,
    geraamdBedrag: data.geraamdBedrag != null ? String(data.geraamdBedrag) : undefined,
    werkelijkBedrag: data.werkelijkBedrag != null ? String(data.werkelijkBedrag) : undefined,
  };

  const [row] = await db.insert(bestellingen).values(insertData).returning();
  await logAudit({ actorUserId: session.user?.id, entityType: "bestelling", entityId: row.id, action: "create", after: row });
  return created(row);
});
