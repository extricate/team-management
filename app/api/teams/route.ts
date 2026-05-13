import { db } from "@/lib/db";
import { teams } from "@/lib/db/schema";
import { ok, created, badRequest, requireAuth, withErrorHandling } from "@/lib/api";
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

export const POST = withErrorHandling(async (req: Request) => {
  const session = await requireAuth();
  const body = await req.json();
  const parsed = TeamSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);
  return created(await createTeam(parsed.data, session.user?.id));
});
