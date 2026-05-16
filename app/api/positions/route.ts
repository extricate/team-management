import { db } from "@/lib/db";
import { positions } from "@/lib/db/schema";
import { ok, created, requireAuth, withErrorHandling, withMutation } from "@/lib/api";
import { PositionSchema } from "@/lib/schemas";
import { createPosition } from "@/lib/services/positions";
import { isNull } from "drizzle-orm";

export const GET = withErrorHandling(async () => {
  await requireAuth();
  const rows = await db.query.positions.findMany({
    where: isNull(positions.deletedAt),
    with: {
      organisation: true,
      assignments: { with: { employee: true } },
      teamCouplings: { with: { team: true } },
    },
  });
  return ok(rows);
});

export const POST = withMutation(PositionSchema, async ({ session, data }) => {
  return created(await createPosition(data, session.user?.id));
});
