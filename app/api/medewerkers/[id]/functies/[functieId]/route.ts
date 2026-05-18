import { ok, notFound, withMutation, withErrorHandling, requireAuth, RouteContext } from "@/lib/api";
import { MedewerkerFunctieUpdateSchema } from "@/lib/schemas";
import { endFunctie, setPrimary } from "@/lib/services/medewerker-functies";
import { db } from "@/lib/db";
import { medewerkerFuncties } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const PATCH = withMutation(MedewerkerFunctieUpdateSchema, async ({ session, data, ctx }) => {
  const { functieId: assignmentId } = await ctx.params;

  if (data.isPrimary === true) {
    await setPrimary(assignmentId, { userId: session.user?.id });
  }

  if (data.status === "ended" || data.endDate) {
    await endFunctie(assignmentId, data.reason ?? null, { userId: session.user?.id });
  }

  const [row] = await db.select().from(medewerkerFuncties).where(eq(medewerkerFuncties.id, assignmentId));
  if (!row) return notFound("Functietoewijzing niet gevonden");
  return ok(row);
});

export const DELETE = withErrorHandling(async (_req: Request, ctx: RouteContext) => {
  const session = await requireAuth();
  const { functieId: assignmentId } = await ctx.params;
  await endFunctie(assignmentId, null, { userId: session.user?.id });
  return ok({ id: assignmentId });
});
