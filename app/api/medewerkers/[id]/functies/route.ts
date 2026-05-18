import { db } from "@/lib/db";
import { medewerkerFuncties, functies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ok, created, withMutation, withErrorHandling, requireAuth, RouteContext } from "@/lib/api";
import { MedewerkerFunctieSchema } from "@/lib/schemas";
import { assignFunctie } from "@/lib/services/medewerker-functies";

export const GET = withErrorHandling(async (_req: Request, ctx: RouteContext) => {
  await requireAuth();
  const { id: employeeId } = await ctx.params;
  const rows = await db
    .select({ assignment: medewerkerFuncties, functie: functies })
    .from(medewerkerFuncties)
    .innerJoin(functies, eq(medewerkerFuncties.functieId, functies.id))
    .where(eq(medewerkerFuncties.employeeId, employeeId))
    .orderBy(medewerkerFuncties.startDate);
  return ok(rows);
});

export const POST = withMutation(MedewerkerFunctieSchema, async ({ session, data, ctx }) => {
  const { id: employeeId } = await ctx.params;
  const row = await assignFunctie(
    employeeId,
    data.functieId,
    data.startDate,
    data.isPrimary ?? false,
    { userId: session.user?.id },
  );
  return created(row);
});
