import { db } from "@/lib/db";
import { teams } from "@/lib/db/schema";
import { ok, created, requireAuth, withErrorHandling, withMutation } from "@/lib/api";
import { TeamSchema } from "@/lib/schemas";
import { createTeam } from "@/lib/services/teams";
import { isNull } from "drizzle-orm";

export const GET = withErrorHandling(async () => {
  await requireAuth();
  const rows = await db.query.teams.findMany({
    where: isNull(teams.deletedAt),
    with: { organisation: true },
  });
  return ok(rows);
});

export const POST = withMutation(TeamSchema, async ({ session, data }) => {
  return created(await createTeam(data, session.user?.id));
});
