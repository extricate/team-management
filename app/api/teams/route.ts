import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { teams } from "@/lib/db/schema";
import { ok, created, badRequest, requireAuth, withErrorHandling } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { isNull } from "drizzle-orm";

const Schema = z.object({
  organisationId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
});

export const GET = withErrorHandling(async () => {
  await requireAuth();
  const rows = await db.query.teams.findMany({
    where: isNull(teams.deletedAt),
    with: { organisation: true },
  });
  return ok(rows);
}) as () => Promise<Response>;

export const POST = withErrorHandling(async (req: unknown) => {
  const session = await requireAuth();
  const body = await (req as NextRequest).json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const [row] = await db.insert(teams).values(parsed.data).returning();
  await logAudit({ actorUserId: session.user?.id, entityType: "team", entityId: row.id, action: "create", after: row as Record<string, unknown> });
  return created(row);
}) as (req: Request) => Promise<Response>;
