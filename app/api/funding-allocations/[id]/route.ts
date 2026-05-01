import { db } from "@/lib/db";
import { fundingAllocations } from "@/lib/db/schema";
import { ok, notFound, badRequest, requireAuth, withErrorHandling, RouteContext } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { FundingAllocationUpdateSchema, parseNullableDate } from "@/lib/schemas";
import { eq } from "drizzle-orm";

export const GET = withErrorHandling(async (_req: Request, ctx: RouteContext) => {
  await requireAuth();
  const { id } = await ctx.params;
  const [row] = await db.select().from(fundingAllocations).where(eq(fundingAllocations.id, id));
  if (!row) return notFound("Allocatie niet gevonden.");
  return ok(row);
});

export const PATCH = withErrorHandling(async (req: Request, ctx: RouteContext) => {
  const session = await requireAuth();
  const { id } = await ctx.params;
  const [before] = await db.select().from(fundingAllocations).where(eq(fundingAllocations.id, id));
  if (!before) return notFound("Allocatie niet gevonden.");

  const body = await req.json();
  const parsed = FundingAllocationUpdateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const data = {
    ...parsed.data,
    startDate: parseNullableDate(parsed.data.startDate),
    endDate: parseNullableDate(parsed.data.endDate),
    updatedAt: new Date(),
  };
  const [after] = await db.update(fundingAllocations).set(data).where(eq(fundingAllocations.id, id)).returning();
  await logAudit({ actorUserId: session.user?.id, entityType: "fundingAllocation", entityId: id, action: "update", before, after });
  return ok(after);
});

export const DELETE = withErrorHandling(async (_req: Request, ctx: RouteContext) => {
  const session = await requireAuth();
  const { id } = await ctx.params;
  const [before] = await db.select().from(fundingAllocations).where(eq(fundingAllocations.id, id));
  if (!before) return notFound("Allocatie niet gevonden.");

  await db.delete(fundingAllocations).where(eq(fundingAllocations.id, id));
  await logAudit({ actorUserId: session.user?.id, entityType: "fundingAllocation", entityId: id, action: "delete", before });
  return ok({ message: "Verwijderd" });
});
