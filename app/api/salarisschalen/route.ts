import { db } from "@/lib/db";
import { salarisschalen } from "@/lib/db/schema";
import { ok, created, badRequest, conflict, requireAuth, withErrorHandling } from "@/lib/api";
import { SalarisschaalSchema } from "@/lib/schemas";
import { logAudit } from "@/lib/audit";
import { asc } from "drizzle-orm";

export const GET = withErrorHandling(async () => {
  await requireAuth();
  const rows = await db.select().from(salarisschalen).orderBy(asc(salarisschalen.schaalCode), asc(salarisschalen.year));
  return ok(rows);
});

export const POST = withErrorHandling(async (req: Request) => {
  const session = await requireAuth();
  const body = await req.json();
  const parsed = SalarisschaalSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  try {
    const [row] = await db.insert(salarisschalen).values(parsed.data).returning();
    await logAudit({ actorUserId: session.user?.id, entityType: "salarisschaal", entityId: row.id, action: "create", after: row });
    return created(row);
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "23505") return conflict("Deze schaalcode bestaat al voor dit jaar.");
    throw e;
  }
});
