import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { financialSources } from "@/lib/db/schema";
import { ok, notFound, badRequest, requireAuth, withErrorHandling } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { eq } from "drizzle-orm";

type Ctx = { params: { id: string } };

const UpdateSchema = z.object({
  projectId: z.string().min(1).max(100).optional(),
  name: z.string().min(1).max(200).optional(),
});

export const GET = withErrorHandling(async (_req: unknown, ctx: unknown) => {
  await requireAuth();
  const { id } = (ctx as Ctx).params;
  const row = await db.query.financialSources.findFirst({
    where: eq(financialSources.id, id),
    with: {
      organisation: true,
      types: true,
      amounts: {
        with: {
          financialType: true,
          allocations: {
            with: { position: { with: { team: true } }, team: true, createdByUser: true },
          },
        },
      },
    },
  });
  if (!row || row.deletedAt) return notFound();
  return ok(row);
}) as (_req: Request, ctx: Ctx) => Promise<Response>;

export const PATCH = withErrorHandling(async (req: unknown, ctx: unknown) => {
  const session = await requireAuth();
  const { id } = (ctx as Ctx).params;
  const [before] = await db.select().from(financialSources).where(eq(financialSources.id, id));
  if (!before || before.deletedAt) return notFound();

  const body = await (req as NextRequest).json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const [after] = await db.update(financialSources).set({ ...parsed.data, updatedAt: new Date() }).where(eq(financialSources.id, id)).returning();
  await logAudit({ actorUserId: session.user.id, entityType: "financialSource", entityId: id, action: "update", before: before as Record<string, unknown>, after: after as Record<string, unknown> });
  return ok(after);
}) as (req: Request, ctx: Ctx) => Promise<Response>;

export const DELETE = withErrorHandling(async (_req: unknown, ctx: unknown) => {
  const session = await requireAuth();
  const { id } = (ctx as Ctx).params;
  const [before] = await db.select().from(financialSources).where(eq(financialSources.id, id));
  if (!before || before.deletedAt) return notFound();

  await db.update(financialSources).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(financialSources.id, id));
  await logAudit({ actorUserId: session.user.id, entityType: "financialSource", entityId: id, action: "archive", before: before as Record<string, unknown> });
  return ok({ message: "Gearchiveerd" });
}) as (_req: Request, ctx: Ctx) => Promise<Response>;
