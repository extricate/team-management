"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api";
import { CreateUserSchema } from "@/lib/schemas";
import { hashPassword } from "@/lib/auth/password";

export async function createUser(
  _prevState: unknown,
  formData: FormData,
): Promise<{ error: string } | undefined> {
  const session = await requireAuth();
  if (session.user.role !== "admin") return { error: "Onvoldoende rechten." };

  const raw = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    role: formData.get("role") as string,
    organisationId: (formData.get("organisationId") as string) || undefined,
  };

  const parsed = CreateUserSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, parsed.data.email));
  if (existing.length > 0) return { error: "Dit e-mailadres is al in gebruik." };

  const { password, ...rest } = parsed.data;
  const passwordHash = await hashPassword(password);

  await db.insert(users).values({ ...rest, passwordHash, isEnabled: true });

  redirect("/beheer/gebruikers");
}
