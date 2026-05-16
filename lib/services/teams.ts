import { db } from "@/lib/db";
import { teams } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { assertOrgAccess, ForbiddenError, type Actor } from "@/lib/api";
import { dispatchSync } from "@/lib/search/sync";
import { TeamSchema, TeamUpdateSchema } from "@/lib/schemas";
import { and, eq, isNull } from "drizzle-orm";
import type { z } from "zod";

function notFound(): Error {
  const e = new Error("Team niet gevonden");
  (e as Error & { status: number }).status = 404;
  return e;
}

export async function createTeam(data: z.infer<typeof TeamSchema>, actor: Actor) {
  const [row] = await db.insert(teams).values(data).returning();
  await logAudit({ actorUserId: actor.userId, entityType: "team", entityId: row.id, action: "create", after: row });
  dispatchSync("team", row.id);
  return row;
}

export async function updateTeam(id: string, data: z.infer<typeof TeamUpdateSchema>, actor: Actor) {
  const [before] = await db.select().from(teams).where(eq(teams.id, id));
  if (!before || before.deletedAt) throw notFound();
  assertOrgAccess({ user: actor }, before.organisationId);

  const [after] = await db.update(teams).set({ ...data, updatedAt: new Date() }).where(eq(teams.id, id)).returning();
  await logAudit({ actorUserId: actor.userId, entityType: "team", entityId: id, action: "update", before, after });
  dispatchSync("team", id);
  return after;
}

export async function archiveTeam(id: string, actor: Actor) {
  const [before] = await db.select().from(teams).where(eq(teams.id, id));
  if (!before || before.deletedAt) throw notFound();
  assertOrgAccess({ user: actor }, before.organisationId);

  await db.update(teams).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(teams.id, id));
  await logAudit({ actorUserId: actor.userId, entityType: "team", entityId: id, action: "archive", before });
  dispatchSync("team", id);
}

export async function createTeamsBulk(organisationId: string, names: string[], actor: Actor) {
  const results = { created: 0, skipped: 0, errors: [] as string[] };

  for (const rawName of names) {
    const name = rawName.trim();
    if (!name) continue;

    const existing = await db.query.teams.findFirst({
      where: and(
        eq(teams.name, name),
        eq(teams.organisationId, organisationId),
        isNull(teams.deletedAt),
      ),
    });

    if (existing) {
      results.skipped++;
      continue;
    }

    try {
      await createTeam({ organisationId, name }, actor);
      results.created++;
    } catch (err) {
      results.errors.push(`"${name}": ${err instanceof Error ? err.message : "Onbekende fout"}`);
    }
  }

  return results;
}

export { ForbiddenError };
