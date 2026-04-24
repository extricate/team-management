import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { organisations } from "@/lib/db/schema";
import { ok, created, badRequest, requireAuth, withErrorHandling } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { isNull } from "drizzle-orm";

const Schema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(["OS1", "OS2"]),
});

export const GET = withErrorHandling(async () => {
  await requireAuth();
  const rows = await db.select().from(organisations).where(isNull(organisations.deletedAt));
  return ok(rows);
}) as () => Promise<Response>;

export const POST = withErrorHandling(async (req: unknown) => {
  const session = await requireAuth();
  const body = await (req as NextRequest).json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const [row] = await db.insert(organisations).values(parsed.data).returning();
  await logAudit({ actorUserId: session.user?.id, entityType: "organisation", entityId: row.id, action: "create", after: row as Record<string, unknown> });
  return created(row);
}) as (req: Request) => Promise<Response>;
