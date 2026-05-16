import { z } from "zod";
import { db } from "@/lib/db";
import { positionAssignments } from "@/lib/db/schema";
import { ok, notFound, withMutation } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { eq } from "drizzle-orm";

const UpdateSchema = z.object({
  status: z.enum(["active", "ended"]).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional().nullable(),
  reason: z.string().optional().nullable(),
});

export const PATCH = withMutation(UpdateSchema, async ({ session, data, ctx }) => {
  const { id } = await ctx.params;
  const [before] = await db.select().from(positionAssignments).where(eq(positionAssignments.id, id));
  if (!before) return notFound("Positietoewijzing niet gevonden.");

  const updateData = {
    ...data,
    startDate: data.startDate ? new Date(data.startDate) : undefined,
    endDate: data.endDate ? new Date(data.endDate) : data.endDate === null ? null : undefined,
    updatedAt: new Date(),
  };
  const [after] = await db.update(positionAssignments).set(updateData).where(eq(positionAssignments.id, id)).returning();
  await logAudit({ actorUserId: session.user?.id, entityType: "positionAssignment", entityId: id, action: "update", before: before as Record<string, unknown>, after: after as Record<string, unknown> });
  return ok(after);
});
