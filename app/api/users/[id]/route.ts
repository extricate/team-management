import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { ok, notFound, badRequest, requireAuth, withErrorHandling, RouteContext } from "@/lib/api";
import { UpdateUserSchema } from "@/lib/schemas";
import { hashPassword } from "@/lib/auth/password";
import { eq } from "drizzle-orm";

const SAFE_FIELDS = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  organisationId: users.organisationId,
  isEnabled: users.isEnabled,
  totpEnabled: users.totpEnabled,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
};

export const GET = withErrorHandling(async (_req: Request, ctx: RouteContext) => {
  await requireAuth();
  const { id } = await ctx.params;
  const [user] = await db.select(SAFE_FIELDS).from(users).where(eq(users.id, id));
  if (!user) return notFound("Gebruiker niet gevonden");
  return ok(user);
});

export const PATCH = withErrorHandling(async (req: Request, ctx: RouteContext) => {
  await requireAuth();
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = UpdateUserSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const { password, ...rest } = parsed.data;
  const extra = password ? { passwordHash: await hashPassword(password) } : {};

  const [updated] = await db
    .update(users)
    .set({ ...rest, ...extra, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning(SAFE_FIELDS);
  if (!updated) return notFound("Gebruiker niet gevonden");
  return ok(updated);
});

export const DELETE = withErrorHandling(async (_req: Request, ctx: RouteContext) => {
  await requireAuth();
  const { id } = await ctx.params;
  const [deleted] = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id });
  if (!deleted) return notFound("Gebruiker niet gevonden");
  return ok({ message: "Gebruiker verwijderd" });
});
