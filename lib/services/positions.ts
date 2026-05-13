import { db } from "@/lib/db";
import { positions } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { dispatchSync } from "@/lib/search/sync";
import { PositionSchema, PositionUpdateSchema } from "@/lib/schemas";
import { eq } from "drizzle-orm";
import type { z } from "zod";

function notFound(): Error {
  const e = new Error("Positie niet gevonden");
  (e as Error & { status: number }).status = 404;
  return e;
}

export async function createPosition(data: z.infer<typeof PositionSchema>, userId: string | undefined) {
  const [row] = await db.insert(positions).values(data).returning();
  await logAudit({ actorUserId: userId, entityType: "position", entityId: row.id, action: "create", after: row });
  dispatchSync("position", row.id);
  return row;
}

export async function updatePosition(
  id: string,
  data: z.infer<typeof PositionUpdateSchema>,
  userId: string | undefined,
) {
  const [before] = await db.select().from(positions).where(eq(positions.id, id));
  if (!before || before.deletedAt) throw notFound();

  const [after] = await db.update(positions).set({ ...data, updatedAt: new Date() }).where(eq(positions.id, id)).returning();
  await logAudit({ actorUserId: userId, entityType: "position", entityId: id, action: "update", before, after });
  dispatchSync("position", id);
  return after;
}

export async function archivePosition(id: string, userId: string | undefined) {
  const [before] = await db.select().from(positions).where(eq(positions.id, id));
  if (!before || before.deletedAt) throw notFound();

  await db.update(positions).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(positions.id, id));
  await logAudit({ actorUserId: userId, entityType: "position", entityId: id, action: "archive", before });
  dispatchSync("position", id);
}
