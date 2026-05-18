import { ok, withErrorHandling, requireAuth, RouteContext } from "@/lib/api";
import { endFunctie } from "@/lib/services/medewerker-functies";

export const DELETE = withErrorHandling(async (_req: Request, ctx: RouteContext) => {
  const session = await requireAuth();
  const { functieId: assignmentId } = await ctx.params;
  await endFunctie(assignmentId, null, { userId: session.user?.id });
  return ok({ id: assignmentId });
});
