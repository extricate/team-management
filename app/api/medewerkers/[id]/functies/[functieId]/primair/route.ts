import { db } from "@/lib/db";
import { medewerkerFuncties } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ok, notFound, withErrorHandling, requireAuth, RouteContext } from "@/lib/api";
import { setPrimary } from "@/lib/services/medewerker-functies";

export const PATCH = withErrorHandling(async (_req: Request, ctx: RouteContext) => {
  const session = await requireAuth();
  const { functieId: assignmentId } = await ctx.params;
  await setPrimary(assignmentId, { userId: session.user?.id });
  const [row] = await db.select().from(medewerkerFuncties).where(eq(medewerkerFuncties.id, assignmentId));
  if (!row) return notFound("Functietoewijzing niet gevonden");
  return ok(row);
});
