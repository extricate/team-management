import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { ok, badRequest, requireAuth, withErrorHandling } from "@/lib/api";
import { UpdateMyPreferencesSchema } from "@/lib/schemas";
import { eq } from "drizzle-orm";

export const PATCH = withErrorHandling(async (req: Request) => {
  const session = await requireAuth();
  const body = await req.json();
  const parsed = UpdateMyPreferencesSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const [updated] = await db
    .update(users)
    .set({ defaultOrganisationId: parsed.data.defaultOrganisationId, updatedAt: new Date() })
    .where(eq(users.id, session.user.id))
    .returning({ id: users.id, defaultOrganisationId: users.defaultOrganisationId });

  return ok(updated);
});
