import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { ok, withMutation } from "@/lib/api";
import { UpdateMyPreferencesSchema } from "@/lib/schemas";
import { eq } from "drizzle-orm";

export const PATCH = withMutation(UpdateMyPreferencesSchema, async ({ session, data }) => {
  const [updated] = await db
    .update(users)
    .set({ defaultOrganisationId: data.defaultOrganisationId, updatedAt: new Date() })
    .where(eq(users.id, session.user.id))
    .returning({ id: users.id, defaultOrganisationId: users.defaultOrganisationId });

  return ok(updated);
});
