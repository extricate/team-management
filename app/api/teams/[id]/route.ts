import { db } from "@/lib/db";
import { teams } from "@/lib/db/schema";
import { ok, notFound, requireAuth, withErrorHandling, withMutation, RouteContext } from "@/lib/api";
import { TeamUpdateSchema } from "@/lib/schemas";
import { updateTeam, archiveTeam } from "@/lib/services/teams";
import { eq } from "drizzle-orm";

export const GET = withErrorHandling(async (_req: Request, ctx: RouteContext) => {
  await requireAuth();
  const { id } = await ctx.params;
  const row = await db.query.teams.findFirst({
    where: eq(teams.id, id),
    with: {
      organisation: true,
      positionCouplings: { with: { position: true } },
      memberships: { with: { employee: true } },
      fundingAllocations: { with: { financialSourceAmount: { with: { financialSource: true } } } },
    },
  });
  if (!row || row.deletedAt) return notFound();
  return ok(row);
});

export const PATCH = withMutation(TeamUpdateSchema, async ({ session, data, ctx }) => {
  const { id } = await ctx.params;
  return ok(await updateTeam(id, data, session, session.user?.id));
});

export const DELETE = withErrorHandling(async (_req: Request, ctx: RouteContext) => {
  const session = await requireAuth();
  const { id } = await ctx.params;
  await archiveTeam(id, session, session.user?.id);
  return ok({ message: "Gearchiveerd" });
});
