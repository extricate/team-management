import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { fundingAllocations } from "@/lib/db/schema";
import { ok, created, badRequest, err, requireAuth, withErrorHandling } from "@/lib/api";
import { logAudit } from "@/lib/audit";

const Schema = z.object({
  financialSourceAmountId: z.string().uuid(),
  positionId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
  amount: z.string().optional(),
  percentage: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  reason: z.string().optional(),
}).refine(d => d.positionId || d.teamId, { message: "positionId or teamId required" });

export const GET = withErrorHandling(async () => {
  await requireAuth();
  const rows = await db.query.fundingAllocations.findMany({
    with: {
      financialSourceAmount: { with: { financialSource: true, financialType: true } },
      position: { with: { team: true } },
      team: true,
      createdByUser: true,
    },
  });
  return ok(rows);
}) as () => Promise<Response>;

export const POST = withErrorHandling(async (req: unknown) => {
  const session = await requireAuth();
  const body = await (req as NextRequest).json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const [row] = await db.insert(fundingAllocations).values({
    ...parsed.data,
    startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
    endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
    createdBy: session.user?.id,
  }).returning();

  await logAudit({ actorUserId: session.user?.id, entityType: "fundingAllocation", entityId: row.id, action: "assign", after: row as Record<string, unknown>, reason: parsed.data.reason });
  return created(row);
}) as (req: Request) => Promise<Response>;
