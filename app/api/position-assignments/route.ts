import { z } from "zod";
import { db } from "@/lib/db";
import { positionAssignments } from "@/lib/db/schema";
import { created, badRequest, requireAuth, withErrorHandling } from "@/lib/api";
import { logAudit } from "@/lib/audit";

const Schema = z.object({
  positionId: z.string().uuid(),
  employeeId: z.string().uuid(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  reason: z.string().optional(),
});

export const POST = withErrorHandling(async (req: Request) => {
  const session = await requireAuth();
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const [row] = await db.insert(positionAssignments).values({
    ...parsed.data,
    startDate: new Date(parsed.data.startDate),
    endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
    createdBy: session.user?.id,
  }).returning();

  await logAudit({ actorUserId: session.user?.id, entityType: "positionAssignment", entityId: row.id, action: "assign", after: row as Record<string, unknown>, reason: parsed.data.reason });
  return created(row);
});
