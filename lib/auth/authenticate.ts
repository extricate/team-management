import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import { verifyTotpCodeWithCounter, decryptTotpSecret } from "@/lib/auth/totp";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export type AuthResult =
  | { status: "success"; userId: string }
  | { status: "totp_required"; userId: string }
  | { status: "invalid_credentials" }
  | { status: "invalid_totp" }
  | { status: "account_disabled" }
  | { status: "account_locked"; lockedUntil: Date };

export async function authenticate(
  email: string,
  password: string,
  totpCode: string | undefined,
  totpKey: string,
): Promise<AuthResult> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user || !user.passwordHash) return { status: "invalid_credentials" };
  if (!user.isEnabled) return { status: "account_disabled" };

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return { status: "account_locked", lockedUntil: user.lockedUntil };
  }

  const passwordOk = await verifyPassword(password, user.passwordHash);

  if (!passwordOk) {
    const newAttempts = (user.failedLoginAttempts ?? 0) + 1;
    const lockedUntil =
      newAttempts >= MAX_ATTEMPTS
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
        : null;
    await db
      .update(users)
      .set({ failedLoginAttempts: newAttempts, lockedUntil, updatedAt: new Date() })
      .where(eq(users.id, user.id))
      .returning();
    return { status: "invalid_credentials" };
  }

  // Password correct — reset counter
  if ((user.failedLoginAttempts ?? 0) > 0) {
    await db
      .update(users)
      .set({ failedLoginAttempts: 0, lockedUntil: null, updatedAt: new Date() })
      .where(eq(users.id, user.id))
      .returning();
  }

  if (!user.totpEnabled || !user.totpSecret) {
    return { status: "success", userId: user.id };
  }

  if (!totpCode) return { status: "totp_required", userId: user.id };

  const rawSecret = decryptTotpSecret(user.totpSecret, totpKey);
  const matchedCounter = verifyTotpCodeWithCounter(
    rawSecret,
    totpCode,
    user.lastTotpCounter ?? undefined,
  );

  if (matchedCounter === null) return { status: "invalid_totp" };

  await db
    .update(users)
    .set({ lastTotpCounter: matchedCounter, updatedAt: new Date() })
    .where(eq(users.id, user.id))
    .returning();

  return { status: "success", userId: user.id };
}
