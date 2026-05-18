import { db } from "@/lib/db";
import { medewerkerFuncties } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { and, eq, isNull } from "drizzle-orm";
import type { Actor } from "@/lib/api";

function notFound(): Error {
  return Object.assign(new Error("Functietoewijzing niet gevonden"), { status: 404 });
}

function conflict(): Error {
  return Object.assign(new Error("Deze functie is al toegewezen aan deze medewerker."), { status: 409 });
}

async function clearPrimary(employeeId: string): Promise<void> {
  await db
    .update(medewerkerFuncties)
    .set({ isPrimary: false, updatedAt: new Date() })
    .where(and(
      eq(medewerkerFuncties.employeeId, employeeId),
      eq(medewerkerFuncties.isPrimary, true),
      isNull(medewerkerFuncties.endDate),
    ));
}

export async function assignFunctie(
  employeeId: string,
  functieId: string,
  startDate: Date,
  isPrimary: boolean,
  actor: Actor,
) {
  if (isPrimary) await clearPrimary(employeeId);

  let row: typeof medewerkerFuncties.$inferSelect;
  try {
    [row] = await db
      .insert(medewerkerFuncties)
      .values({ employeeId, functieId, isPrimary, startDate, createdBy: actor.userId })
      .returning();
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "23505") throw conflict();
    throw e;
  }

  await logAudit({ actorUserId: actor.userId, entityType: "medewerker_functie", entityId: row.id, action: "create", after: row });
  return row;
}

export async function endFunctie(id: string, reason: string | null, actor: Actor) {
  const [before] = await db.select().from(medewerkerFuncties).where(eq(medewerkerFuncties.id, id));
  if (!before || before.status === "ended") throw notFound();

  await db
    .update(medewerkerFuncties)
    .set({ endDate: new Date(), status: "ended", reason: reason ?? undefined, updatedAt: new Date() })
    .where(eq(medewerkerFuncties.id, id));

  await logAudit({ actorUserId: actor.userId, entityType: "medewerker_functie", entityId: id, action: "end", before });
}

export async function setPrimary(id: string, actor: Actor) {
  const [target] = await db.select().from(medewerkerFuncties).where(eq(medewerkerFuncties.id, id));
  if (!target || target.status === "ended") throw notFound();

  await clearPrimary(target.employeeId);
  await db.update(medewerkerFuncties).set({ isPrimary: true, updatedAt: new Date() }).where(eq(medewerkerFuncties.id, id));
  await logAudit({ actorUserId: actor.userId, entityType: "medewerker_functie", entityId: id, action: "set_primary", before: target });
}

export async function getMedewerkerFuncties(employeeId: string) {
  return db
    .select()
    .from(medewerkerFuncties)
    .where(eq(medewerkerFuncties.employeeId, employeeId))
    .orderBy(medewerkerFuncties.startDate);
}
