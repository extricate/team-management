import { db } from "@/lib/db";
import { teamPositionCouplings } from "@/lib/db/schema";
import { ok, notFound, withMutation } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { TeamPositionCouplingUpdateSchema } from "@/lib/schemas";
import { eq } from "drizzle-orm";

export const PATCH = withMutation(TeamPositionCouplingUpdateSchema, async ({ session, data, ctx }) => {
  const { id } = await ctx.params;

  const [before] = await db.select().from(teamPositionCouplings).where(eq(teamPositionCouplings.id, id));
  if (!before) return notFound();

  const [after] = await db
    .update(teamPositionCouplings)
    .set({
      endDate: data.endDate,
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
