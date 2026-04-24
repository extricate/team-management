import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auditEvents } from "@/lib/db/schema";
import { ok, requireAuth, withErrorHandling } from "@/lib/api";
import { and, eq, desc } from "drizzle-orm";

export const GET = withErrorHandling(async (req: unknown) => {
  await requireAuth();
  const url = new URL((req as NextRequest).url);
  const entityType = url.searchParams.get("entityType");
  const entityId = url.searchParams.get("entityId");

  const rows = await db.query.auditEvents.findMany({
    where: entityType && entityId
      ? and(eq(auditEvents.entityType, entityType), eq(auditEvents.entityId, entityId))
      : undefined,
    with: { actorUser: true },
    orderBy: [desc(auditEvents.createdAt)],
    limit: 100,
  });
  return ok(rows);
}) as (req: Request) => Promise<Response>;
