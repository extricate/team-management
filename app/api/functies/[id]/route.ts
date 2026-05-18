import { db } from "@/lib/db";
import { functies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ok, notFound, withMutation, withErrorHandling, requireAuth, RouteContext } from "@/lib/api";
import { FunctieUpdateSchema } from "@/lib/schemas";
import { updateFunctie, archiveFunctie } from "@/lib/services/functies";

export const GET = withErrorHandling(async (_req: Request, ctx: RouteContext) => {
  await requireAuth();
  const { id } = await ctx.params;
  const [row] = await db.select().from(functies).where(eq(functies.id, id));
  if (!row) return notFound("Functie niet gevonden");
  return ok(row);
});

export const PATCH = withMutation(FunctieUpdateSchema, async ({ session, data, ctx }) => {
  const { id } = await ctx.params;
  const row = await updateFunctie(id, data, { userId: session.user?.id });
  return ok(row);
});

export const DELETE = withErrorHandling(async (_req: Request, ctx: RouteContext) => {
  const session = await requireAuth();
  const { id } = await ctx.params;
  await archiveFunctie(id, { userId: session.user?.id });
  return ok({ id });
});
