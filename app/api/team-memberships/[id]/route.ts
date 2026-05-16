import { db } from "@/lib/db";
import { teamMemberships } from "@/lib/db/schema";
import { ok, notFound, withMutation } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { TeamMembershipUpdateSchema } from "@/lib/schemas";
import { eq } from "drizzle-orm";

export const PATCH = withMutation(TeamMembershipUpdateSchema, async ({ session, data, ctx }) => {
  const { id } = await ctx.params;
  const [before] = await db.select().from(teamMemberships).where(eq(teamMemberships.id, id));
  if (!before) return notFound("Teamlidmaatschap niet gevonden.");

  const updateData = { ...data, updatedAt: new Date() };
  const [after] = await db.update(teamMemberships).set(updateData).where(eq(teamMemberships.id, id)).returning();
  await logAudit({ actorUserId: session.user?.id, entityType: "teamMembership", entityId: id, action: "update", before, after });
  return ok(after);
});
