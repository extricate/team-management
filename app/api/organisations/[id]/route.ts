import { db } from "@/lib/db";
import { organisations } from "@/lib/db/schema";
import { ok, notFound, requireAuth, withErrorHandling, withMutation, assertOrgAccess, RouteContext } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { dispatchSync } from "@/lib/search/sync";
import { OrganisationUpdateSchema } from "@/lib/schemas";
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
  const [before] = await db.select().from(organisations).where(eq(organisations.id, id));
  if (!before || before.deletedAt) return notFound();
  assertOrgAccess(session, before.id);

  const [after] = await db.update(organisations).set({ ...data, updatedAt: new Date() }).where(eq(organisations.id, id)).returning();
  await logAudit({ actorUserId: session.user?.id, entityType: "organisation", entityId: id, action: "update", before, after });
  dispatchSync("organisation", id);
  return ok(after);
});

export const DELETE = withErrorHandling(async (_req: Request, ctx: RouteContext) => {
  const session = await requireAuth();
  const { id } = await ctx.params;
  const [before] = await db.select().from(organisations).where(eq(organisations.id, id));
  if (!before || before.deletedAt) return notFound();
  assertOrgAccess(session, before.id);

  const [after] = await db.update(organisations).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(organisations.id, id)).returning();
  await logAudit({ actorUserId: session.user?.id, entityType: "organisation", entityId: id, action: "archive", before, after });
  dispatchSync("organisation", id);
  return ok({ message: "Gearchiveerd" });
});
