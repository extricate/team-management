import { db } from "@/lib/db";
import { organisations } from "@/lib/db/schema";
import { ok, created, requireAuth, withErrorHandling, withMutation } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { dispatchSync } from "@/lib/search/sync";
import { OrganisationSchema } from "@/lib/schemas";
import { isNull } from "drizzle-orm";

export const GET = withErrorHandling(async () => {
  await requireAuth();
  const rows = await db.select().from(organisations).where(isNull(organisations.deletedAt));
  return ok(rows);
});

export const POST = withMutation(OrganisationSchema, async ({ session, data }) => {
  const [row] = await db.insert(organisations).values(data).returning();
  await logAudit({ actorUserId: session.user?.id, entityType: "organisation", entityId: row.id, action: "create", after: row });
  dispatchSync("organisation", row.id);
  return created(row);
});
