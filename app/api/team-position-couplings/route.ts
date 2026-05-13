import { db } from "@/lib/db";
import { teamPositionCouplings } from "@/lib/db/schema";
import { created, badRequest, conflict, requireAuth, withErrorHandling } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { TeamPositionCouplingSchema } from "@/lib/schemas";
import { and, eq, isNull } from "drizzle-orm";

export const POST = withErrorHandling(async (req: Request) => {
  const session = await requireAuth();
  const body = await req.json();
  const parsed = TeamPositionCouplingSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const active = await db.query.teamPositionCouplings.findFirst({
    where: and(
      eq(teamPositionCouplings.positionId, parsed.data.positionId),
      isNull(teamPositionCouplings.endDate),
    ),
  });
  if (active) return conflict("Positie is al gekoppeld aan een team");

  const [row] = await db
    .insert(teamPositionCouplings)
    .values({
      ...parsed.data,
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
