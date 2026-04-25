import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { ok, notFound, badRequest, requireAuth, withErrorHandling, RouteContext } from "@/lib/api";
import { eq } from "drizzle-orm";

const UpdateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  role: z.enum(["admin", "manager", "viewer"]).optional(),
});

export const GET = withErrorHandling(async (_req: Request, ctx: RouteContext) => {
  await requireAuth();
  const { id } = ctx.params;
  const [user] = await db.select().from(users).where(eq(users.id, id));
  if (!user) return notFound("Gebruiker niet gevonden");
  return ok(user);
});

export const PATCH = withErrorHandling(async (req: Request, ctx: RouteContext) => {
  await requireAuth();
  const { id } = ctx.params;
  const body = await req.json();
  const parsed = UpdateUserSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);
  const [updated] = await db.update(users).set({ ...parsed.data, updatedAt: new Date() }).where(eq(users.id, id)).returning();
  if (!updated) return notFound("Gebruiker niet gevonden");
  return ok(updated);
});

export const DELETE = withErrorHandling(async (_req: Request, ctx: RouteContext) => {
  await requireAuth();
  const { id } = ctx.params;
  const [deleted] = await db.delete(users).where(eq(users.id, id)).returning();
  if (!deleted) return notFound("Gebruiker niet gevonden");
  return ok({ message: "Gebruiker verwijderd" });
});
