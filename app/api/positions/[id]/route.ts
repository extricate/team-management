import { db } from "@/lib/db";
import { positions } from "@/lib/db/schema";
import { ok, notFound, badRequest, requireAuth, withErrorHandling, RouteContext } from "@/lib/api";
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

export const PATCH = withErrorHandling(async (req: Request, ctx: RouteContext) => {
  const session = await requireAuth();
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = PositionUpdateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);
  return ok(await updatePosition(id, parsed.data, session.user?.id));
});

export const DELETE = withErrorHandling(async (_req: Request, ctx: RouteContext) => {
  const session = await requireAuth();
  const { id } = await ctx.params;
  await archivePosition(id, session.user?.id);
  return ok({ message: "Gearchiveerd" });
});
