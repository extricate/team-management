import { db } from "@/lib/db";
import { ok, requireAuth, withErrorHandling } from "@/lib/api";

export const GET = withErrorHandling(async () => {
  await requireAuth();
  const rows = await db.query.bestellingTypes.findMany();
  return ok(rows);
});
