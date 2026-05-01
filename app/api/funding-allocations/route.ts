import { db } from "@/lib/db";
import { fundingAllocations } from "@/lib/db/schema";
import { ok, created, badRequest, requireAuth, withErrorHandling } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { FundingAllocationSchema, parseDate } from "@/lib/schemas";

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
});

export const POST = withErrorHandling(async (req: Request) => {
  const session = await requireAuth();
  const body = await req.json();
  const parsed = FundingAllocationSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const [row] = await db.insert(fundingAllocations).values({
    ...parsed.data,
    startDate: parseDate(parsed.data.startDate),
    endDate: parseDate(parsed.data.endDate),
    createdBy: session.user?.id,
  }).returning();

  await logAudit({ actorUserId: session.user?.id, entityType: "fundingAllocation", entityId: row.id, action: "assign", after: row, reason: parsed.data.reason });
  return created(row);
});
