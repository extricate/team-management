import { db } from "@/lib/db";
import { organisations } from "@/lib/db/schema";
import { ok, notFound, requireAuth, withErrorHandling, withMutation, actorFromSession, RouteContext } from "@/lib/api";
import { OrganisationUpdateSchema } from "@/lib/schemas";
import { updateOrganisation, archiveOrganisation } from "@/lib/services/organisations";
import { eq } from "drizzle-orm";

export const GET = withErrorHandling(async (_req: Request, ctx: RouteContext) => {
  await requireAuth();
  const { id } = await ctx.params;
  const [row] = await db.select().from(organisations).where(eq(organisations.id, id));
  if (!row || row.deletedAt) return notFound();
  return ok(row);
});

export const PATCH = withMutation(OrganisationUpdateSchema, async ({ session, data, ctx }) => {
  const { id } = await ctx.params;
  return ok(await updateOrganisation(id, data, actorFromSession(session)));
});

export const DELETE = withErrorHandling(async (_req: Request, ctx: RouteContext) => {
  const session = await requireAuth();
  const { id } = await ctx.params;
  await archiveOrganisation(id, actorFromSession(session));
  return ok({ message: "Gearchiveerd" });
});
