import { db } from "@/lib/db";
import { ok, created, requireAuth, withErrorHandling, withMutation } from "@/lib/api";
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

export const POST = withMutation(FundingAllocationSchema, async ({ session, data }) => {
  const { row, warnings } = await createFundingAllocation(data, session.user?.id);
  return created(warnings.length > 0 ? { ...row, warnings } : row);
});
