import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { positions } from "@/lib/db/schema";
import { ok, notFound, badRequest, requireAuth, withErrorHandling } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { eq } from "drizzle-orm";

type Ctx = { params: { id: string } };

const UpdateSchema = z.object({
  type: z.string().min(1).optional(),
  positionCode: z.string().optional().nullable(),
  status: z.enum(["planned", "open", "filled", "closed"]).optional(),
  expectedStart: z.string().datetime().optional().nullable(),
  expectedEnd: z.string().datetime().optional().nullable(),
});

export const GET = withErrorHandling(async (_req: unknown, ctx: unknown) => {
  await requireAuth();
  const { id } = (ctx as Ctx).params;
  const row = await db.query.positions.findFirst({
    where: eq(positions.id, id),
    with: {
      team: { with: { organisation: true } },
      assignments: { with: { employee: true, createdByUser: true } },
      fundingAllocations: { with: { financialSourceAmount: { with: { financialSource: true, financialType: true } } } },
    },
  });
  if (!row || row.deletedAt) return notFound();
  return ok(row);
}) as (_req: Request, ctx: Ctx) => Promise<Response>;

export const PATCH = withErrorHandling(async (req: unknown, ctx: unknown) => {
  const session = await requireAuth();
  const { id } = (ctx as Ctx).params;
  const [before] = await db.select().from(positions).where(eq(positions.id, id));
  if (!before || before.deletedAt) return notFound();

  const body = await (req as NextRequest).json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const data = {
    ...parsed.data,
    expectedStart: parsed.data.expectedStart ? new Date(parsed.data.expectedStart) : parsed.data.expectedStart === null ? null : undefined,
    expectedEnd: parsed.data.expectedEnd ? new Date(parsed.data.expectedEnd) : parsed.data.expectedEnd === null ? null : undefined,
    updatedAt: new Date(),
  };
  const [after] = await db.update(positions).set(data).where(eq(positions.id, id)).returning();
  await logAudit({ actorUserId: session.user?.id, entityType: "position", entityId: id, action: "update", before: before as Record<string, unknown>, after: after as Record<string, unknown> });
  return ok(after);
}) as (req: Request, ctx: Ctx) => Promise<Response>;

export const DELETE = withErrorHandling(async (_req: unknown, ctx: unknown) => {
  const session = await requireAuth();
  const { id } = (ctx as Ctx).params;
  const [before] = await db.select().from(positions).where(eq(positions.id, id));
  if (!before || before.deletedAt) return notFound();

  await db.update(positions).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(positions.id, id));
  await logAudit({ actorUserId: session.user?.id, entityType: "position", entityId: id, action: "archive", before: before as Record<string, unknown> });
  return ok({ message: "Gearchiveerd" });
}) as (_req: Request, ctx: Ctx) => Promise<Response>;
