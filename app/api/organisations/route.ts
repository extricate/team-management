import { db } from "@/lib/db";
import { organisations } from "@/lib/db/schema";
import { ok, created, badRequest, requireAuth, withErrorHandling } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { dispatchSync } from "@/lib/search/sync";
import { OrganisationSchema } from "@/lib/schemas";
import { isNull } from "drizzle-orm";

export const GET = withErrorHandling(async () => {
  await requireAuth();
  const rows = await db.select().from(organisations).where(isNull(organisations.deletedAt));
  return ok(rows);
});

export const POST = withErrorHandling(async (req: Request) => {
  const session = await requireAuth();
  const body = await req.json();
  const parsed = OrganisationSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const [row] = await db.insert(organisations).values(parsed.data).returning();
  await logAudit({ actorUserId: session.user?.id, entityType: "organisation", entityId: row.id, action: "create", after: row });
  dispatchSync("organisation", row.id);
  return created(row);
});
