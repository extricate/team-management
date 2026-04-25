import { z } from "zod";
import { db } from "@/lib/db";
import { teams } from "@/lib/db/schema";
import { ok, notFound, badRequest, requireAuth, withErrorHandling, RouteContext } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { eq } from "drizzle-orm";

const UpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  organisationId: z.string().uuid().optional(),
});

export const GET = withErrorHandling(async (_req: Request, ctx: RouteContext) => {
  await requireAuth();
  const { id } = ctx.params;
  const row = await db.query.teams.findFirst({
    where: eq(teams.id, id),
    with: {
      organisation: true,
      positions: true,
      memberships: { with: { employee: true } },
      fundingAllocations: { with: { financialSourceAmount: { with: { financialSource: true } } } },
    },
  });
  if (!row || row.deletedAt) return notFound();
  return ok(row);
});

export const PATCH = withErrorHandling(async (req: Request, ctx: RouteContext) => {
  const session = await requireAuth();
  const { id } = ctx.params;
  const [before] = await db.select().from(teams).where(eq(teams.id, id));
  if (!before || before.deletedAt) return notFound();

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const [after] = await db.update(teams).set({ ...parsed.data, updatedAt: new Date() }).where(eq(teams.id, id)).returning();
  await logAudit({ actorUserId: session.user?.id, entityType: "team", entityId: id, action: "update", before: before as Record<string, unknown>, after: after as Record<string, unknown> });
  return ok(after);
});

export const DELETE = withErrorHandling(async (_req: Request, ctx: RouteContext) => {
  const session = await requireAuth();
  const { id } = ctx.params;
  const [before] = await db.select().from(teams).where(eq(teams.id, id));
  if (!before || before.deletedAt) return notFound();

  await db.update(teams).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(teams.id, id));
  await logAudit({ actorUserId: session.user?.id, entityType: "team", entityId: id, action: "archive", before: before as Record<string, unknown> });
  return ok({ message: "Gearchiveerd" });
});
