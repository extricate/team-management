import { db } from "@/lib/db";
import { teamMemberships } from "@/lib/db/schema";
import { created, withMutation } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { TeamMembershipSchema } from "@/lib/schemas";

export const POST = withMutation(TeamMembershipSchema, async ({ session, data }) => {
  const [row] = await db.insert(teamMemberships).values({
    ...data,
    createdBy: session.user?.id,
  }).returning();

  await logAudit({ actorUserId: session.user?.id, entityType: "teamMembership", entityId: row.id, action: "assign", after: row, reason: data.reason });
  return created(row);
});
