import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { ok, created, badRequest, err, requireAuth, withErrorHandling } from "@/lib/api";
import { eq } from "drizzle-orm";

const CreateUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  role: z.enum(["admin", "manager", "viewer"]).default("viewer"),
});

export const GET = withErrorHandling(async () => {
  await requireAuth();
  const allUsers = await db.select().from(users).orderBy(users.createdAt);
  return ok(allUsers);
});

export const POST = withErrorHandling(async (req: Request) => {
  await requireAuth();
  const body = await req.json();
  const parsed = CreateUserSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const existing = await db.select().from(users).where(eq(users.email, parsed.data.email));
  if (existing.length > 0) return err("E-mailadres is al in gebruik", 409);

  const [newUser] = await db.insert(users).values(parsed.data).returning();
  return created(newUser);
});
