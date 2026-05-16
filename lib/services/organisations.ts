import { db } from "@/lib/db";
import { organisations } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { assertOrgAccess, ForbiddenError, type Actor } from "@/lib/api";
import { dispatchSync } from "@/lib/search/sync";
import { OrganisationUpdateSchema } from "@/lib/schemas";
import { eq } from "drizzle-orm";
import type { z } from "zod";

function notFound(): Error {
  const e = new Error("Organisatie niet gevonden");
  (e as Error & { status: number }).status = 404;
  return e;
}

export async function updateOrganisation(
  id: string,
  data: z.infer<typeof OrganisationUpdateSchema>,
  actor: Actor,
) {
  const [before] = await db.select().from(organisations).where(eq(organisations.id, id));
  if (!before || before.deletedAt) throw notFound();
  assertOrgAccess({ user: actor }, before.id);

  const [after] = await db.update(organisations).set({ ...data, updatedAt: new Date() }).where(eq(organisations.id, id)).returning();
  await logAudit({ actorUserId: actor.userId, entityType: "organisation", entityId: id, action: "update", before, after });
  dispatchSync("organisation", id);
  return after;
}

export async function archiveOrganisation(id: string, actor: Actor) {
  const [before] = await db.select().from(organisations).where(eq(organisations.id, id));
  if (!before || before.deletedAt) throw notFound();
  assertOrgAccess({ user: actor }, before.id);

  const [after] = await db.update(organisations).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(organisations.id, id)).returning();
  await logAudit({ actorUserId: actor.userId, entityType: "organisation", entityId: id, action: "archive", before, after });
  dispatchSync("organisation", id);
}

export { ForbiddenError };
