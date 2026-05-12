import { db } from "@/lib/db";
import { positions } from "@/lib/db/schema";
import { ok, created, badRequest, requireAuth, withErrorHandling } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { dispatchSync } from "@/lib/search/sync";
import { PositionSchema, parseDate } from "@/lib/schemas";
import { isNull } from "drizzle-orm";

export const GET = withErrorHandling(async () => {
  await requireAuth();
  const rows = await db.query.positions.findMany({
    where: isNull(positions.deletedAt),
    with: {
      organisation: true,
      assignments: { with: { employee: true } },
      teamCouplings: { with: { team: true } },
    },
  });
  return ok(rows);
});

export const POST = withErrorHandling(async (req: Request) => {
  const session = await requireAuth();
  const body = await req.json();
  const parsed = PositionSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const data = {
    ...parsed.data,
    annualCost: parsed.data.annualCost != null ? String(parsed.data.annualCost) : undefined,
    expectedStart: parseDate(parsed.data.expectedStart),
    expectedEnd: parseDate(parsed.data.expectedEnd),
    requiredBefore: parseDate(parsed.data.requiredBefore),
  };
  const [row] = await db.insert(positions).values(data).returning();
  await logAudit({ actorUserId: session.user?.id, entityType: "position", entityId: row.id, action: "create", after: row });
  dispatchSync("position", row.id);
  return created(row);
});
