import { db } from "@/lib/db";
import { teamMemberships } from "@/lib/db/schema";
import { ok, notFound, badRequest, requireAuth, withErrorHandling, RouteContext } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { TeamMembershipUpdateSchema } from "@/lib/schemas";
import { eq } from "drizzle-orm";

export const PATCH = withErrorHandling(async (req: Request, ctx: RouteContext) => {
  const session = await requireAuth();
  const { id } = await ctx.params;
  const [before] = await db.select().from(teamMemberships).where(eq(teamMemberships.id, id));
  if (!before) return notFound("Teamlidmaatschap niet gevonden.");

  const body = await req.json();
  const parsed = TeamMembershipUpdateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const data = {
    ...parsed.data,
    updatedAt: new Date(),
  };
  const [after] = await db.update(teamMemberships).set(data).where(eq(teamMemberships.id, id)).returning();
  await logAudit({ actorUserId: session.user?.id, entityType: "teamMembership", entityId: id, action: "update", before, after });
  return ok(after);
});
