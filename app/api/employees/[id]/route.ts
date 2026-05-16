import { db } from "@/lib/db";
import { employees } from "@/lib/db/schema";
import { ok, notFound, requireAuth, withErrorHandling, withMutation, assertOrgAccess, RouteContext } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { dispatchSync } from "@/lib/search/sync";
import { EmployeeUpdateSchema } from "@/lib/schemas";
import { eq } from "drizzle-orm";

export const GET = withErrorHandling(async (_req: Request, ctx: RouteContext) => {
  await requireAuth();
  const { id } = await ctx.params;
  const row = await db.query.employees.findFirst({
    where: eq(employees.id, id),
    with: {
      organisation: true,
      memberships: { with: { team: true, createdByUser: true } },
      positionAssignments: { with: { position: { with: { teamCouplings: { with: { team: true } } } }, createdByUser: true } },
    },
  });
  if (!row || row.deletedAt) return notFound();
  return ok(row);
});

export const PATCH = withMutation(EmployeeUpdateSchema, async ({ session, data, ctx }) => {
  const { id } = await ctx.params;
  const [before] = await db.select().from(employees).where(eq(employees.id, id));
  if (!before || before.deletedAt) return notFound();
  assertOrgAccess(session, before.organisationId);

  const [after] = await db.update(employees).set({ ...data, updatedAt: new Date() }).where(eq(employees.id, id)).returning();
  await logAudit({ actorUserId: session.user?.id, entityType: "employee", entityId: id, action: "update", before, after });
  dispatchSync("employee", id);
  return ok(after);
});

export const DELETE = withErrorHandling(async (_req: Request, ctx: RouteContext) => {
  const session = await requireAuth();
  const { id } = await ctx.params;
  const [before] = await db.select().from(employees).where(eq(employees.id, id));
  if (!before || before.deletedAt) return notFound();
  assertOrgAccess(session, before.organisationId);

  await db.update(employees).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(employees.id, id));
  await logAudit({ actorUserId: session.user?.id, entityType: "employee", entityId: id, action: "archive", before });
  dispatchSync("employee", id);
  return ok({ message: "Gearchiveerd" });
});
