import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { ok, notFound, badRequest, requireAuth, withErrorHandling } from "@/lib/api";
import { eq } from "drizzle-orm";

type RouteContext = { params: { id: string } };

const UpdateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  role: z.enum(["admin", "manager", "member"]).optional(),
});

export const GET = withErrorHandling(async (_req: unknown, ctx: unknown) => {
  await requireAuth();
  const { id } = (ctx as RouteContext).params;
  const [user] = await db.select().from(users).where(eq(users.id, id));
  if (!user) return notFound("Gebruiker niet gevonden");
  return ok(user);
}) as (_req: Request, ctx: RouteContext) => Promise<Response>;

export const PATCH = withErrorHandling(async (req: unknown, ctx: unknown) => {
  await requireAuth();
  const { id } = (ctx as RouteContext).params;
  const body = await (req as NextRequest).json();
  const parsed = UpdateUserSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);
  const [updated] = await db.update(users).set({ ...parsed.data, updatedAt: new Date() }).where(eq(users.id, id)).returning();
  if (!updated) return notFound("Gebruiker niet gevonden");
  return ok(updated);
}) as (req: Request, ctx: RouteContext) => Promise<Response>;

export const DELETE = withErrorHandling(async (_req: unknown, ctx: unknown) => {
  await requireAuth();
  const { id } = (ctx as RouteContext).params;
  const [deleted] = await db.delete(users).where(eq(users.id, id)).returning();
  if (!deleted) return notFound("Gebruiker niet gevonden");
  return ok({ message: "Gebruiker verwijderd" });
}) as (_req: Request, ctx: RouteContext) => Promise<Response>;
