import { db } from "@/lib/db";
import { fundingAllocations } from "@/lib/db/schema";
import { ok, notFound, withMutation, requireAuth, withErrorHandling, RouteContext } from "@/lib/api";
import { FundingAllocationUpdateSchema } from "@/lib/schemas";
import { updateFundingAllocation, deleteFundingAllocation } from "@/lib/services/funding-allocations";
import { eq } from "drizzle-orm";

export const GET = withErrorHandling(async (_req: Request, ctx: RouteContext) => {
  await requireAuth();
  const { id } = await ctx.params;
  const [row] = await db.select().from(fundingAllocations).where(eq(fundingAllocations.id, id));
  if (!row) return notFound("Allocatie niet gevonden.");
  return ok(row);
});

export const PATCH = withMutation(FundingAllocationUpdateSchema, async ({ session, data, ctx }) => {
  const { id } = await ctx.params;
  return ok(await updateFundingAllocation(id, data, session.user?.id));
});

export const DELETE = withErrorHandling(async (_req: Request, ctx: RouteContext) => {
  const session = await requireAuth();
  const { id } = await ctx.params;
  await deleteFundingAllocation(id, session.user?.id);
  return ok({ message: "Verwijderd" });
});
