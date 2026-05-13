import { db } from "@/lib/db";
import { positions } from "@/lib/db/schema";
import { ok, created, badRequest, requireAuth, withErrorHandling } from "@/lib/api";
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

export const POST = withErrorHandling(async (req: Request) => {
  const session = await requireAuth();
  const body = await req.json();
  const parsed = PositionSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);
  return created(await createPosition(parsed.data, session.user?.id));
});
