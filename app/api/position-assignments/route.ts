import { db } from "@/lib/db";
import { positionAssignments } from "@/lib/db/schema";
import { created, withMutation } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { PositionAssignmentSchema } from "@/lib/schemas";

export const POST = withMutation(PositionAssignmentSchema, async ({ session, data }) => {
  const [row] = await db.insert(positionAssignments).values({
    ...data,
    createdBy: session.user?.id,
  }).returning();

  await logAudit({ actorUserId: session.user?.id, entityType: "positionAssignment", entityId: row.id, action: "assign", after: row, reason: data.reason });
  return created(row);
});
