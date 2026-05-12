import { db } from "@/lib/db";
import { positions } from "@/lib/db/schema";
import { ok, notFound, badRequest, requireAuth, withErrorHandling, RouteContext } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { dispatchSync } from "@/lib/search/sync";
import { PositionUpdateSchema, parseNullableDate } from "@/lib/schemas";
import { eq } from "drizzle-orm";

export const GET = withErrorHandling(async (_req: Request, ctx: RouteContext) => {
  await requireAuth();
  const { id } = await ctx.params;
  const row = await db.query.positions.findFirst({
    where: eq(positions.id, id),
    with: {
      organisation: true,
      assignments: { with: { employee: true, createdByUser: true } },
      fundingAllocations: { with: { financialSourceAmount: { with: { financialSource: true, type: true } } } },
      teamCouplings: { with: { team: true } },
    },
  });
  if (!row || row.deletedAt) return notFound();
  return ok(row);
});

export const PATCH = withErrorHandling(async (req: Request, ctx: RouteContext) => {
  const session = await requireAuth();
  const { id } = await ctx.params;
  const [before] = await db.select().from(positions).where(eq(positions.id, id));
  if (!before || before.deletedAt) return notFound();

  const body = await req.json();
  const parsed = PositionUpdateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const data = {
    ...parsed.data,
    annualCost: parsed.data.annualCost != null ? String(parsed.data.annualCost) : parsed.data.annualCost === null ? null : undefined,
    expectedStart: parseNullableDate(parsed.data.expectedStart),
    expectedEnd: parseNullableDate(parsed.data.expectedEnd),
    requiredBefore: parseNullableDate(parsed.data.requiredBefore),
    updatedAt: new Date(),
  };
  const [after] = await db.update(positions).set(data).where(eq(positions.id, id)).returning();
  await logAudit({ actorUserId: session.user?.id, entityType: "position", entityId: id, action: "update", before, after });
  dispatchSync("position", id);
  return ok(after);
});

export const DELETE = withErrorHandling(async (_req: Request, ctx: RouteContext) => {
  const session = await requireAuth();
  const { id } = await ctx.params;
  const [before] = await db.select().from(positions).where(eq(positions.id, id));
  if (!before || before.deletedAt) return notFound();

  await db.update(positions).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(positions.id, id));
  await logAudit({ actorUserId: session.user?.id, entityType: "position", entityId: id, action: "archive", before });
  dispatchSync("position", id);
  return ok({ message: "Gearchiveerd" });
});
