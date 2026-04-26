import { z } from "zod";
import { db } from "@/lib/db";
import { teamMemberships } from "@/lib/db/schema";
import { ok, notFound, badRequest, requireAuth, withErrorHandling, RouteContext } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { eq } from "drizzle-orm";

const UpdateSchema = z.object({
  status: z.enum(["active", "ended"]).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional().nullable(),
  reason: z.string().optional().nullable(),
});

export const PATCH = withErrorHandling(async (req: Request, ctx: RouteContext) => {
  const session = await requireAuth();
  const { id } = ctx.params;
  const [before] = await db.select().from(teamMemberships).where(eq(teamMemberships.id, id));
  if (!before) return notFound("Teamlidmaatschap niet gevonden.");

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const data = {
    ...parsed.data,
    startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
    endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : parsed.data.endDate === null ? null : undefined,
    updatedAt: new Date(),
  };
  const [after] = await db.update(teamMemberships).set(data).where(eq(teamMemberships.id, id)).returning();
  await logAudit({ actorUserId: session.user?.id, entityType: "teamMembership", entityId: id, action: "update", before: before as Record<string, unknown>, after: after as Record<string, unknown> });
  return ok(after);
});
