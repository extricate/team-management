import { db } from "@/lib/db";
import { teamPositionCouplings } from "@/lib/db/schema";
import { created, conflict, withMutation } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { TeamPositionCouplingSchema } from "@/lib/schemas";
import { and, eq, isNull } from "drizzle-orm";

export const POST = withMutation(TeamPositionCouplingSchema, async ({ session, data }) => {
  const active = await db.query.teamPositionCouplings.findFirst({
    where: and(
      eq(teamPositionCouplings.positionId, data.positionId),
      isNull(teamPositionCouplings.endDate),
    ),
  });
  if (active) return conflict("Positie is al gekoppeld aan een team");

  const [row] = await db
    .insert(teamPositionCouplings)
    .values({
      ...data,
      createdBy: session.user?.id,
    })
    .returning();

  await logAudit({
    actorUserId: session.user?.id,
    entityType: "teamPositionCoupling",
    entityId: row.id,
    action: "create",
    after: row,
  });

  return created(row);
});
