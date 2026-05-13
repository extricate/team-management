import { db } from "@/lib/db";
import { teamMemberships } from "@/lib/db/schema";
import { created, badRequest, requireAuth, withErrorHandling } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { TeamMembershipSchema } from "@/lib/schemas";

export const POST = withErrorHandling(async (req: Request) => {
  const session = await requireAuth();
  const body = await req.json();
  const parsed = TeamMembershipSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const [row] = await db.insert(teamMemberships).values({
    ...parsed.data,
    createdBy: session.user?.id,
  }).returning();

  await logAudit({ actorUserId: session.user?.id, entityType: "teamMembership", entityId: row.id, action: "assign", after: row, reason: parsed.data.reason });
  return created(row);
});
