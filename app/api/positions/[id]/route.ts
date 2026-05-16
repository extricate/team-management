import { db } from "@/lib/db";
import { positions } from "@/lib/db/schema";
import { ok, notFound, requireAuth, withErrorHandling, withMutation, actorFromSession, RouteContext } from "@/lib/api";
import { PositionUpdateSchema } from "@/lib/schemas";
import { updatePosition, archivePosition } from "@/lib/services/positions";
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

export const PATCH = withMutation(PositionUpdateSchema, async ({ session, data, ctx }) => {
  const { id } = await ctx.params;
  return ok(await updatePosition(id, data, actorFromSession(session)));
});

export const DELETE = withErrorHandling(async (_req: Request, ctx: RouteContext) => {
  const session = await requireAuth();
  const { id } = await ctx.params;
  await archivePosition(id, actorFromSession(session));
  return ok({ message: "Gearchiveerd" });
});
