import { db } from "@/lib/db";
import { functies } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { assertNotSentinel } from "@/lib/functies";
import { FunctieSchema, FunctieUpdateSchema } from "@/lib/schemas";
import { and, asc, eq, isNull } from "drizzle-orm";
import type { Actor } from "@/lib/api";
import type { z } from "zod";

function notFound(): Error {
  return Object.assign(new Error("Functie niet gevonden"), { status: 404 });
}

function conflict(): Error {
  return Object.assign(new Error("Er bestaat al een functie met deze titel."), { status: 409 });
}

export async function createFunctie(data: z.infer<typeof FunctieSchema>, actor: Actor) {
  let row: typeof functies.$inferSelect;
  try {
    [row] = await db.insert(functies).values(data).returning();
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "23505") throw conflict();
    throw e;
  }
  await logAudit({ actorUserId: actor.userId, entityType: "functie", entityId: row.id, action: "create", after: row });
  return row;
}

export async function updateFunctie(id: string, data: z.infer<typeof FunctieUpdateSchema>, actor: Actor) {
  const [before] = await db.select().from(functies).where(eq(functies.id, id));
  if (!before || before.deletedAt) throw notFound();
  assertNotSentinel(before);

  let after: typeof before;
  try {
    [after] = await db.update(functies).set({ ...data, updatedAt: new Date() }).where(eq(functies.id, id)).returning();
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "23505") throw conflict();
    throw e;
  }
  await logAudit({ actorUserId: actor.userId, entityType: "functie", entityId: id, action: "update", before, after });
  return after;
}

export async function archiveFunctie(id: string, actor: Actor) {
  const [before] = await db.select().from(functies).where(eq(functies.id, id));
  if (!before || before.deletedAt) throw notFound();
  assertNotSentinel(before);

  await db.update(functies).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(functies.id, id));
  await logAudit({ actorUserId: actor.userId, entityType: "functie", entityId: id, action: "archive", before });
}

export async function deactivateFunctie(id: string, actor: Actor) {
  const [before] = await db.select().from(functies).where(eq(functies.id, id));
  if (!before || before.deletedAt) throw notFound();
  assertNotSentinel(before);

  const [after] = await db
    .update(functies)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(functies.id, id))
    .returning();
  await logAudit({ actorUserId: actor.userId, entityType: "functie", entityId: id, action: "deactivate", before, after });
}

export async function getActiveFuncties() {
  return db
    .select()
    .from(functies)
    .where(and(eq(functies.isActive, true), isNull(functies.deletedAt)))
    .orderBy(asc(functies.titel));
}

export async function getAllFuncties() {
  return db
    .select()
    .from(functies)
    .where(isNull(functies.deletedAt))
    .orderBy(asc(functies.titel));
}
