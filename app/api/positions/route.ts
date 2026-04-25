import { z } from "zod";
import { db } from "@/lib/db";
import { positions } from "@/lib/db/schema";
import { ok, created, badRequest, requireAuth, withErrorHandling } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { isNull } from "drizzle-orm";

const Schema = z.object({
  teamId: z.string().uuid(),
  type: z.string().min(1), // e.g. OPF1, OPF2
  positionCode: z.string().optional(),
  status: z.enum(["planned", "open", "filled", "closed"]).default("planned"),
  expectedStart: z.string().datetime().optional(),
  expectedEnd: z.string().datetime().optional(),
});

export const GET = withErrorHandling(async () => {
  await requireAuth();
  const rows = await db.query.positions.findMany({
    where: isNull(positions.deletedAt),
    with: { team: { with: { organisation: true } }, assignments: { with: { employee: true } } },
  });
  return ok(rows);
});

export const POST = withErrorHandling(async (req: Request) => {
  const session = await requireAuth();
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const data = {
    ...parsed.data,
    expectedStart: parsed.data.expectedStart ? new Date(parsed.data.expectedStart) : undefined,
    expectedEnd: parsed.data.expectedEnd ? new Date(parsed.data.expectedEnd) : undefined,
  };
  const [row] = await db.insert(positions).values(data).returning();
  await logAudit({ actorUserId: session.user?.id, entityType: "position", entityId: row.id, action: "create", after: row as Record<string, unknown> });
  return created(row);
});
