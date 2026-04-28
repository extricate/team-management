import { z } from "zod";
import { db } from "@/lib/db";
import { financialSources, financialTypes, financialSourceAmounts } from "@/lib/db/schema";
import { ok, badRequest, notFound, requireAuth, withErrorHandling, RouteContext } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { eq, and } from "drizzle-orm";

const EntrySchema = z.object({
  type: z.enum(["PERSEX", "MATEX", "Investeringen"]),
  year: z.number().int().min(2000).max(2099),
  amount: z.number().nonnegative(),
  status: z.enum(["concept", "released"]).default("concept"),
});

const Schema = z.object({
  entries: z.array(EntrySchema).min(1).max(200),
});

export const PUT = withErrorHandling(async (req: Request, ctx: RouteContext) => {
  const session = await requireAuth();
  const { id } = ctx.params;

  const [source] = await db
    .select({ id: financialSources.id })
    .from(financialSources)
    .where(eq(financialSources.id, id));
  if (!source) return notFound("Financieringsbron niet gevonden.");

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  let upserted = 0;

  for (const entry of parsed.data.entries) {
    if (entry.amount <= 0) continue;

    // Find or create the financial type for this (source, category, year)
    let [existingType] = await db
      .select()
      .from(financialTypes)
      .where(
        and(
          eq(financialTypes.financialSourceId, id),
          eq(financialTypes.type, entry.type),
          eq(financialTypes.year, entry.year),
        ),
      );

    if (!existingType) {
      [existingType] = await db
        .insert(financialTypes)
        .values({ financialSourceId: id, type: entry.type, year: entry.year })
        .returning();
    }

    // Determine default dates: Jan 1 of the budget year
    const yearStart = new Date(entry.year, 0, 1);

    // Find existing amounts linked to this type
    const existing = await db
      .select()
      .from(financialSourceAmounts)
      .where(eq(financialSourceAmounts.financialTypeId, existingType.id));

    if (existing.length === 0) {
      await db.insert(financialSourceAmounts).values({
        financialSourceId: id,
        financialTypeId: existingType.id,
        amount: String(entry.amount),
        status: entry.status,
        effectiveDate: yearStart,
        releaseDate: entry.status === "released" ? yearStart : null,
      });
    } else {
      // Update the primary (first) amount; leave any additional amounts untouched
      const primary = existing[0];
      await db
        .update(financialSourceAmounts)
        .set({
          amount: String(entry.amount),
          status: entry.status,
          effectiveDate: yearStart,
          releaseDate: entry.status === "released"
            ? (primary.releaseDate ?? yearStart)
            : primary.releaseDate,
          updatedAt: new Date(),
        })
        .where(eq(financialSourceAmounts.id, primary.id));
    }

    upserted++;
  }

  await logAudit({
    actorUserId: session.user?.id,
    entityType: "financialSource",
    entityId: id,
    action: "update",
    after: { budgetGridUpdate: upserted } as Record<string, unknown>,
  });

  return ok({ updated: upserted });
});
