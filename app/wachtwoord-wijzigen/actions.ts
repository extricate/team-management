"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { users, auditEvents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api";
import { hashPassword } from "@/lib/auth/password";
import { ChangePasswordSchema } from "@/lib/schemas";
import { FORCE_CHANGE_COOKIE } from "@/proxy";

function sanitizeRedirect(url?: string | null): string {
  if (url && url.startsWith("/") && !url.startsWith("//")) return url;
  return "/dashboard";
}

export async function changePassword(
  _prevState: unknown,
  formData: FormData,
): Promise<{ error: string } | undefined> {
  const session = await requireAuth();

  if (!session.user.mustChangePassword) {
    return { error: "Geen wachtwoordwijziging vereist." };
  }

  const raw = {
    password: (formData.get("password") as string | null) ?? "",
    confirmPassword: (formData.get("confirmPassword") as string | null) ?? "",
  };

  const parsed = ChangePasswordSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const passwordHash = await hashPassword(parsed.data.password);

  await db
    .update(users)
    .set({ passwordHash, mustChangePassword: false, updatedAt: new Date() })
    .where(eq(users.id, session.user.id));

  await db.insert(auditEvents).values({
    actorUserId: session.user.id,
    entityType: "user",
    entityId: session.user.id as `${string}-${string}-${string}-${string}-${string}`,
    action: "password_changed_from_temporary",
  });

  const jar = await cookies();
  jar.delete(FORCE_CHANGE_COOKIE);

  const callbackUrl = (formData.get("callbackUrl") as string | null);
  redirect(sanitizeRedirect(callbackUrl));
}
