import { z } from "zod";
import { db } from "@/lib/db";
import { positions } from "@/lib/db/schema";
import { ok, created, badRequest, requireAuth, withErrorHandling } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { syncPosition } from "@/lib/search/sync";
import { isNull } from "drizzle-orm";

const Schema = z.object({
  teamId: z.string().uuid(),
  type: z.string().min(1), // identifying name, e.g. "Product Owner"
  opfType: z.string().optional().nullable(), // OPF classification key, e.g. "OPF1", "OPF9-inhuur"
  positionCode: z.string().optional(),
  schaal: z.string().optional(),
  annualCost: z.number().positive().optional(),
  status: z.enum(["planned", "open", "filled", "closed"]).default("planned"),
  expectedStart: z.string().datetime().optional(),
  expectedEnd: z.string().datetime().optional(),
  requiredBefore: z.string().datetime().optional(),
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
    annualCost: parsed.data.annualCost != null ? String(parsed.data.annualCost) : undefined,
    expectedStart: parsed.data.expectedStart ? new Date(parsed.data.expectedStart) : undefined,
    expectedEnd: parsed.data.expectedEnd ? new Date(parsed.data.expectedEnd) : undefined,
    requiredBefore: parsed.data.requiredBefore ? new Date(parsed.data.requiredBefore) : undefined,
  };
  const [row] = await db.insert(positions).values(data).returning();
  await logAudit({ actorUserId: session.user?.id, entityType: "position", entityId: row.id, action: "create", after: row as Record<string, unknown> });
  syncPosition(row.id).catch(err => console.error("[search sync]", err));
  return created(row);
});
