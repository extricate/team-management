import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { ok, created, badRequest, err, requireAuth, withErrorHandling } from "@/lib/api";
import { CreateUserSchema } from "@/lib/schemas";
import { hashPassword } from "@/lib/auth/password";
import { eq } from "drizzle-orm";

export const GET = withErrorHandling(async () => {
  await requireAuth();
  const allUsers = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    organisationId: users.organisationId,
    isEnabled: users.isEnabled,
    totpEnabled: users.totpEnabled,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
  }).from(users).orderBy(users.createdAt);
  return ok(allUsers);
});

export const POST = withErrorHandling(async (req: Request) => {
  await requireAuth();
  const body = await req.json();
  const parsed = CreateUserSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const existing = await db.select().from(users).where(eq(users.email, parsed.data.email));
  if (existing.length > 0) return err("E-mailadres is al in gebruik", 409);

  const { password, ...rest } = parsed.data;
  const passwordHash = await hashPassword(password);

  const [newUser] = await db.insert(users).values({ ...rest, passwordHash, mustChangePassword: true }).returning({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    organisationId: users.organisationId,
    isEnabled: users.isEnabled,
    totpEnabled: users.totpEnabled,
    createdAt: users.createdAt,
  });
  return created(newUser);
});
