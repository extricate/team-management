import { db } from "@/lib/db";
import { ok, created, badRequest, requireAuth, withErrorHandling } from "@/lib/api";
import { FundingAllocationSchema } from "@/lib/schemas";
import { createFundingAllocation } from "@/lib/services/funding-allocations";

export const GET = withErrorHandling(async () => {
  await requireAuth();
  const rows = await db.query.fundingAllocations.findMany({
    with: {
      financialSourceAmount: { with: { financialSource: true, type: true } },
      position: { with: { teamCouplings: { with: { team: true } } } },
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
  const { row, warnings } = await createFundingAllocation(parsed.data, session.user?.id);
  return created(warnings.length > 0 ? { ...row, warnings } : row);
});
