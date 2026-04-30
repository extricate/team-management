import { db } from "@/lib/db";
import { teams } from "@/lib/db/schema";
import { ok, created, badRequest, requireAuth, withErrorHandling } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { dispatchSync } from "@/lib/search/sync";
import { TeamSchema } from "@/lib/schemas";
import { isNull } from "drizzle-orm";

export const GET = withErrorHandling(async () => {
  await requireAuth();
  const rows = await db.query.teams.findMany({
    where: isNull(teams.deletedAt),
    with: { organisation: true },
  });
  return ok(rows);
});

export const POST = withErrorHandling(async (req: Request) => {
  const session = await requireAuth();
  const body = await req.json();
  const parsed = TeamSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const [row] = await db.insert(teams).values(parsed.data).returning();
  await logAudit({ actorUserId: session.user?.id, entityType: "team", entityId: row.id, action: "create", after: row });
  dispatchSync("team", row.id);
  return created(row);
});
