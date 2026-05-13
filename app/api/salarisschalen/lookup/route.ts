import { db } from "@/lib/db";
import { salarisschalen } from "@/lib/db/schema";
import { ok, notFound, badRequest, requireAuth, withErrorHandling } from "@/lib/api";
import { findBestMatch, calculateTotalCost } from "@/lib/salarisschalen";

export const GET = withErrorHandling(async (req: Request) => {
  await requireAuth();
  const url = new URL(req.url);
  const schaalCode = url.searchParams.get("schaal");
  const yearStr = url.searchParams.get("year");

  if (!schaalCode) return badRequest("schaal parameter is vereist");
  if (!yearStr) return badRequest("year parameter is vereist");
  const year = parseInt(yearStr, 10);
  if (isNaN(year)) return badRequest("year moet een geldig getal zijn");

  const rows = await db.select().from(salarisschalen);
  const result = findBestMatch(rows, schaalCode, year);

  if (!result.schaal) return notFound("Geen salarisschaal gevonden voor code: " + schaalCode);

  return ok({
    schaal: result.schaal,
    isExact: result.isExact,
    foundYear: result.foundYear,
    totalCost: calculateTotalCost(result.schaal),
    primaryCost: parseFloat(result.schaal.primaryCost),
    secondaryEffects: parseFloat(result.schaal.secondaryEffects),
    tertiaryEffects: parseFloat(result.schaal.tertiaryEffects),
  });
});
