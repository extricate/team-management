import { ok, badRequest, requireAuth, withErrorHandling, actorFromSession } from "@/lib/api";
import { BulkTeamSchema } from "@/lib/schemas";
import { createTeamsBulk } from "@/lib/services/teams";

export const POST = withErrorHandling(async (req: Request) => {
  const session = await requireAuth();
  const body = await req.json();
  const parsed = BulkTeamSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const { organisationId, names } = parsed.data;
  const results = await createTeamsBulk(organisationId, names, actorFromSession(session));
  return ok(results);
});
