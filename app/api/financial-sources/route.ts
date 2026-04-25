import { z } from "zod";
import { db } from "@/lib/db";
import { financialSources } from "@/lib/db/schema";
import { ok, created, badRequest, requireAuth, withErrorHandling } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { isNull } from "drizzle-orm";

const Schema = z.object({
  organisationId: z.string().uuid(),
  projectId: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
});

export const GET = withErrorHandling(async () => {
  await requireAuth();
  const rows = await db.query.financialSources.findMany({
    where: isNull(financialSources.deletedAt),
    with: {
      organisation: true,
      types: true,
      amounts: { with: { financialType: true, allocations: true } },
    },
  });
  return ok(rows);
});

export const POST = withErrorHandling(async (req: Request) => {
  const session = await requireAuth();
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const [row] = await db.insert(financialSources).values(parsed.data).returning();
  await logAudit({ actorUserId: session.user?.id, entityType: "financialSource", entityId: row.id, action: "create", after: row as Record<string, unknown> });
  return created(row);
});
