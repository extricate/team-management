import { z } from "zod";
import { db } from "@/lib/db";
import { auditEvents } from "@/lib/db/schema";
import { ok, badRequest, requireAuth, withErrorHandling } from "@/lib/api";
import { and, eq, desc } from "drizzle-orm";

const AuditEventsQuerySchema = z
  .object({
    entityType: z.string().max(100).optional(),
    entityId: z.string().uuid().optional(),
  })
  .refine(
    (d) => (d.entityType === undefined) === (d.entityId === undefined),
    { message: "entityType en entityId zijn beide vereist of beide afwezig" },
  );

export const GET = withErrorHandling(async (req: Request) => {
  await requireAuth();
  const url = new URL(req.url);

  const parsed = AuditEventsQuerySchema.safeParse({
    entityType: url.searchParams.get("entityType") ?? undefined,
    entityId: url.searchParams.get("entityId") ?? undefined,
  });
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const { entityType, entityId } = parsed.data;
  const rows = await db.query.auditEvents.findMany({
    where: entityType && entityId
      ? and(eq(auditEvents.entityType, entityType), eq(auditEvents.entityId, entityId))
      : undefined,
    with: { actorUser: true },
    orderBy: [desc(auditEvents.createdAt)],
    limit: 100,
  });
  return ok(rows);
});
