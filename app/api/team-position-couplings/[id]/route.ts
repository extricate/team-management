import { db } from "@/lib/db";
import { teamPositionCouplings } from "@/lib/db/schema";
import { ok, notFound, badRequest, requireAuth, withErrorHandling, RouteContext } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { TeamPositionCouplingUpdateSchema } from "@/lib/schemas";
import { eq } from "drizzle-orm";

export const PATCH = withErrorHandling(async (req: Request, ctx: RouteContext) => {
  const session = await requireAuth();
  const { id } = await ctx.params;

  const [before] = await db.select().from(teamPositionCouplings).where(eq(teamPositionCouplings.id, id));
  if (!before) return notFound();

  const body = await req.json();
  const parsed = TeamPositionCouplingUpdateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const [after] = await db
    .update(teamPositionCouplings)
    .set({
      endDate: parsed.data.endDate,
      updatedAt: new Date(),
    })
    .where(eq(teamPositionCouplings.id, id))
    .returning();

  await logAudit({
    actorUserId: session.user?.id,
    entityType: "teamPositionCoupling",
    entityId: id,
    action: "update",
    before,
    after,
  });

  return ok(after);
});
