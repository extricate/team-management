import { db } from "@/lib/db";
import { bestellingen } from "@/lib/db/schema";
import { ok, notFound, badRequest, requireAuth, withErrorHandling, RouteContext } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { BestellingUpdateSchema, parseNullableDate } from "@/lib/schemas";
import { eq } from "drizzle-orm";

export const GET = withErrorHandling(async (_req: Request, ctx: RouteContext) => {
  await requireAuth();
  const { id } = await ctx.params;
  const row = await db.query.bestellingen.findFirst({
    where: eq(bestellingen.id, id),
    with: {
      type: true,
      organisation: true,
      fundingAllocations: {
        with: {
          financialSourceAmount: { with: { financialSource: true, financialType: true } },
          createdByUser: true,
        },
      },
      positions: {
        with: { team: true, assignments: { with: { employee: true } } },
      },
    },
  });
  if (!row || row.deletedAt) return notFound();
  return ok(row);
});

export const PATCH = withErrorHandling(async (req: Request, ctx: RouteContext) => {
  const session = await requireAuth();
  const { id } = await ctx.params;
  const [before] = await db.select().from(bestellingen).where(eq(bestellingen.id, id));
  if (!before || before.deletedAt) return notFound();

  const body = await req.json();
  const parsed = BestellingUpdateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const data = {
    ...parsed.data,
    geraamdBedrag: parsed.data.geraamdBedrag != null ? String(parsed.data.geraamdBedrag) : parsed.data.geraamdBedrag === null ? null : undefined,
    werkelijkBedrag: parsed.data.werkelijkBedrag != null ? String(parsed.data.werkelijkBedrag) : parsed.data.werkelijkBedrag === null ? null : undefined,
    aanvraagDatum: parseNullableDate(parsed.data.aanvraagDatum),
    updatedAt: new Date(),
  };

  const [after] = await db.update(bestellingen).set(data).where(eq(bestellingen.id, id)).returning();
  await logAudit({ actorUserId: session.user?.id, entityType: "bestelling", entityId: id, action: "update", before, after });
  return ok(after);
});

export const DELETE = withErrorHandling(async (_req: Request, ctx: RouteContext) => {
  const session = await requireAuth();
  const { id } = await ctx.params;
  const [before] = await db.select().from(bestellingen).where(eq(bestellingen.id, id));
  if (!before || before.deletedAt) return notFound();

  await db.update(bestellingen).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(bestellingen.id, id));
  await logAudit({ actorUserId: session.user?.id, entityType: "bestelling", entityId: id, action: "archive", before });
  return ok({ message: "Gearchiveerd" });
});
