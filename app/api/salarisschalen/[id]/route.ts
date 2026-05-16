import { db } from "@/lib/db";
import { salarisschalen } from "@/lib/db/schema";
import { ok, notFound, conflict, withMutation, requireAuth, withErrorHandling, RouteContext } from "@/lib/api";
import { SalarisschaalUpdateSchema } from "@/lib/schemas";
import { logAudit } from "@/lib/audit";
import { eq } from "drizzle-orm";

export const GET = withErrorHandling(async (_req: Request, ctx: RouteContext) => {
  await requireAuth();
  const { id } = await ctx.params;
  const [row] = await db.select().from(salarisschalen).where(eq(salarisschalen.id, id));
  if (!row) return notFound("Salarisschaal niet gevonden");
  return ok(row);
});

export const PATCH = withMutation(SalarisschaalUpdateSchema, async ({ session, data, ctx }) => {
  const { id } = await ctx.params;
  const [before] = await db.select().from(salarisschalen).where(eq(salarisschalen.id, id));
  if (!before) return notFound("Salarisschaal niet gevonden");

  let after: typeof before;
  try {
    [after] = await db
      .update(salarisschalen)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(salarisschalen.id, id))
      .returning();
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "23505") return conflict("Deze schaalcode bestaat al voor dit jaar.");
    throw e;
  }

  await logAudit({ actorUserId: session.user?.id, entityType: "salarisschaal", entityId: id, action: "update", before, after });
  return ok(after);
});

export const DELETE = withErrorHandling(async (_req: Request, ctx: RouteContext) => {
  const session = await requireAuth();
  const { id } = await ctx.params;
  const [before] = await db.select().from(salarisschalen).where(eq(salarisschalen.id, id));
  if (!before) return notFound("Salarisschaal niet gevonden");

  await db.delete(salarisschalen).where(eq(salarisschalen.id, id));
  await logAudit({ actorUserId: session.user?.id, entityType: "salarisschaal", entityId: id, action: "delete", before });
  return ok({ id });
});
