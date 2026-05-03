import { db } from "@/lib/db";
import { positions } from "@/lib/db/schema";
import { ok, requireAuth, withErrorHandling } from "@/lib/api";
import { isNull } from "drizzle-orm";
import { detectPositionConflicts } from "@/lib/dashboard";

export const GET = withErrorHandling(async () => {
  await requireAuth();

  const allPositions = await db.query.positions.findMany({
    where: isNull(positions.deletedAt),
    with: { team: true, fundingAllocations: true },
  });

  const conflicts = detectPositionConflicts(allPositions);
  return ok({ conflicts });
});
