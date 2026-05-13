import { db } from "@/lib/db";
import { teams } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { assertOrgAccess, ForbiddenError } from "@/lib/api";
import { dispatchSync } from "@/lib/search/sync";
import { TeamSchema, TeamUpdateSchema } from "@/lib/schemas";
import { eq } from "drizzle-orm";
import type { z } from "zod";

type Session = { user?: { role?: string | null; organisationId?: string | null; id?: string } | null };

function notFound(): Error {
  const e = new Error("Team niet gevonden");
  (e as Error & { status: number }).status = 404;
  return e;
}

export async function createTeam(data: z.infer<typeof TeamSchema>, userId: string | undefined) {
  const [row] = await db.insert(teams).values(data).returning();
  await logAudit({ actorUserId: userId, entityType: "team", entityId: row.id, action: "create", after: row });
  dispatchSync("team", row.id);
  return row;
}

export async function updateTeam(
  id: string,
  data: z.infer<typeof TeamUpdateSchema>,
  session: Session,
  userId: string | undefined,
) {
  const [before] = await db.select().from(teams).where(eq(teams.id, id));
  if (!before || before.deletedAt) throw notFound();
  assertOrgAccess(session, before.organisationId);

  const [after] = await db.update(teams).set({ ...data, updatedAt: new Date() }).where(eq(teams.id, id)).returning();
  await logAudit({ actorUserId: userId, entityType: "team", entityId: id, action: "update", before, after });
  dispatchSync("team", id);
  return after;
}

export async function archiveTeam(id: string, session: Session, userId: string | undefined) {
  const [before] = await db.select().from(teams).where(eq(teams.id, id));
  if (!before || before.deletedAt) throw notFound();
  assertOrgAccess(session, before.organisationId);

  await db.update(teams).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(teams.id, id));
  await logAudit({ actorUserId: userId, entityType: "team", entityId: id, action: "archive", before });
  dispatchSync("team", id);
}

export { ForbiddenError };
