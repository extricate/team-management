import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { employees } from "@/lib/db/schema";
import { ok, created, badRequest, requireAuth, withErrorHandling } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { isNull } from "drizzle-orm";

const Schema = z.object({
  organisationId: z.string().uuid(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  prefixName: z.string().max(20).optional(),
});

export const GET = withErrorHandling(async () => {
  await requireAuth();
  const rows = await db.query.employees.findMany({
    where: isNull(employees.deletedAt),
    with: {
      organisation: true,
      memberships: { with: { team: true } },
    },
  });
  return ok(rows);
}) as () => Promise<Response>;

export const POST = withErrorHandling(async (req: unknown) => {
  const session = await requireAuth();
  const body = await (req as NextRequest).json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const [row] = await db.insert(employees).values(parsed.data).returning();
  await logAudit({ actorUserId: session.user?.id, entityType: "employee", entityId: row.id, action: "create", after: row as Record<string, unknown> });
  return created(row);
}) as (req: Request) => Promise<Response>;
