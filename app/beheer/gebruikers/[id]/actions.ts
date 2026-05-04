"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api";
import { hashPassword } from "@/lib/auth/password";

export async function updateUser(
  userId: string,
  _prevState: unknown,
  formData: FormData,
): Promise<{ error: string } | undefined> {
  const session = await requireAuth();
  if (session.user.role !== "admin") return { error: "Onvoldoende rechten." };

  const name = (formData.get("name") as string | null)?.trim() || undefined;
  const role = formData.get("role") as string | null;
  const isEnabled = formData.get("isEnabled") === "true";
  const newPassword = (formData.get("newPassword") as string | null)?.trim() || undefined;
  const organisationId = (formData.get("organisationId") as string | null) || null;

  if (newPassword && newPassword.length < 12) {
    return { error: "Wachtwoord moet minimaal 12 tekens bevatten." };
  }

  const passwordHash = newPassword ? await hashPassword(newPassword) : undefined;

  await db.update(users).set({
    ...(name !== undefined ? { name } : {}),
    ...(role ? { role: role as "admin" | "manager" | "viewer" } : {}),
    ...(organisationId !== undefined ? { organisationId } : {}),
    isEnabled,
    ...(passwordHash ? { passwordHash } : {}),
    updatedAt: new Date(),
  }).where(eq(users.id, userId));

  redirect("/beheer/gebruikers");
}

export async function disableTotp(userId: string): Promise<void> {
  const session = await requireAuth();
  if (session.user.role !== "admin") return;

  await db.update(users)
    .set({ totpEnabled: false, totpSecret: null, lastTotpCounter: null, updatedAt: new Date() })
    .where(eq(users.id, userId));

  redirect(`/beheer/gebruikers/${userId}`);
}
