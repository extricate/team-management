import { db } from "@/lib/db";
import { bestellingen } from "@/lib/db/schema";
import { ok, notFound, withMutation, requireAuth, withErrorHandling, RouteContext } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { BestellingUpdateSchema } from "@/lib/schemas";
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
          financialSourceAmount: { with: { financialSource: true, type: true } },
          createdByUser: true,
        },
      },
      positions: {
        with: { teamCouplings: { with: { team: true } }, assignments: { with: { employee: true } } },
      },
    },
  });
  if (!row || row.deletedAt) return notFound();
  return ok(row);
});

export const PATCH = withMutation(BestellingUpdateSchema, async ({ session, data, ctx }) => {
  const { id } = await ctx.params;
  const [before] = await db.select().from(bestellingen).where(eq(bestellingen.id, id));
  if (!before || before.deletedAt) return notFound();

  const updateData = {
    ...data,
    geraamdBedrag: data.geraamdBedrag != null ? String(data.geraamdBedrag) : data.geraamdBedrag === null ? null : undefined,
    werkelijkBedrag: data.werkelijkBedrag != null ? String(data.werkelijkBedrag) : data.werkelijkBedrag === null ? null : undefined,
    updatedAt: new Date(),
  };

  const [after] = await db.update(bestellingen).set(updateData).where(eq(bestellingen.id, id)).returning();
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
