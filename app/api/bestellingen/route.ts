import { db } from "@/lib/db";
import { bestellingen } from "@/lib/db/schema";
import { ok, created, badRequest, requireAuth, withErrorHandling } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { BestellingSchema, parseDate } from "@/lib/schemas";
import { isNull } from "drizzle-orm";

export const GET = withErrorHandling(async () => {
  await requireAuth();
  const rows = await db.query.bestellingen.findMany({
    where: isNull(bestellingen.deletedAt),
    with: {
      type: true,
      organisation: true,
      fundingAllocations: {
        with: { financialSourceAmount: { with: { financialSource: true, financialType: true } } },
      },
      positions: true,
    },
  });
  return ok(rows);
});

export const POST = withErrorHandling(async (req: Request) => {
  const session = await requireAuth();
  const body = await req.json();
  const parsed = BestellingSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const data = {
    ...parsed.data,
    geraamdBedrag: parsed.data.geraamdBedrag != null ? String(parsed.data.geraamdBedrag) : undefined,
    werkelijkBedrag: parsed.data.werkelijkBedrag != null ? String(parsed.data.werkelijkBedrag) : undefined,
    aanvraagDatum: parseDate(parsed.data.aanvraagDatum),
  };

  const [row] = await db.insert(bestellingen).values(data).returning();
  await logAudit({ actorUserId: session.user?.id, entityType: "bestelling", entityId: row.id, action: "create", after: row });
  return created(row);
});
