"use server";

import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { db } from "@/lib/db";
import { users, sessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { authenticate } from "@/lib/auth/authenticate";
import { totpRecoveryCodes } from "@/lib/db/schema";
import { and, isNull } from "drizzle-orm";
import { verifyPassword } from "@/lib/auth/password";
import { checkLoginRateLimit } from "@/lib/auth/rate-limit";
import { getTotpEncryptionKey, getTotpFallbackKey } from "@/lib/auth/totp-key";

const PENDING_COOKIE = "auth_totp_pending";
const PENDING_TTL_MS = 5 * 60 * 1000; // 5 minutes

function sanitizeRedirect(url?: string | null): string {
  if (url && url.startsWith("/") && !url.startsWith("//")) return url;
  return "/dashboard";
}

function signPendingToken(userId: string, expires: number): string {
  const payload = `${userId}:${expires}`;
  const sig = createHmac("sha256", process.env.AUTH_SECRET ?? "")
    .update(payload)
    .digest("hex");
  return `${payload}:${sig}`;
}

function verifyPendingToken(token: string): string | null {
  const parts = token.split(":");
  if (parts.length !== 3) return null;
  const [userId, expiresStr, sig] = parts;
  if (Date.now() > parseInt(expiresStr, 10)) return null;
  const payload = `${userId}:${expiresStr}`;
  const expected = createHmac("sha256", process.env.AUTH_SECRET ?? "")
    .update(payload)
    .digest("hex");
  const sigBuf = Buffer.from(sig, "hex");
  const expBuf = Buffer.from(expected, "hex");
  if (sigBuf.length !== expBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expBuf)) return null;
  return userId;
}

async function createSession(userId: string, callbackUrl?: string | null): Promise<void> {
  const sessionToken = randomUUID();
  const expires = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8-hour workday session
  await db.insert(sessions).values({ sessionToken, userId, expires });
  const jar = await cookies();
  jar.set("authjs.session-token", sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires,
    secure: process.env.NODE_ENV === "production",
  });
  jar.delete(PENDING_COOKIE);
  redirect(sanitizeRedirect(callbackUrl));
}

export async function signInWithPassword(
  _prevState: unknown,
  formData: FormData,
): Promise<{ error: string } | undefined> {
  const email = (formData.get("email") as string | null)?.trim() ?? "";
  const password = (formData.get("password") as string | null) ?? "";
  const callbackUrl = formData.get("callbackUrl") as string | null;

  const reqHeaders = await headers();
  const ip = reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (await checkLoginRateLimit(ip)) {
    return { error: "Te veel inlogpogingen. Probeer het over 15 minuten opnieuw." };
  }

  const result = await authenticate(email, password, undefined);

  switch (result.status) {
    case "success":
      await createSession(result.userId, callbackUrl);
      return; // unreachable — createSession calls redirect()

    case "totp_required": {
      const expires = Date.now() + PENDING_TTL_MS;
      const token = signPendingToken(result.userId, expires);
      const jar = await cookies();
      jar.set(PENDING_COOKIE, token, {
        httpOnly: true,
        sameSite: "strict",
        path: "/inloggen",
        maxAge: PENDING_TTL_MS / 1000,
        secure: process.env.NODE_ENV === "production",
      });
      const callbackParam = callbackUrl ? `&callbackUrl=${encodeURIComponent(callbackUrl)}` : "";
      redirect(`/inloggen?stap=totp${callbackParam}`);
      return;
    }

    case "account_locked":
      return { error: `Account geblokkeerd tot ${result.lockedUntil.toLocaleTimeString("nl-NL")}. Neem contact op met uw beheerder.` };

    case "account_disabled":
      return { error: "Dit account is uitgeschakeld. Neem contact op met uw beheerder." };

    case "invalid_credentials":
    default:
      return { error: "Ongeldige gebruikersnaam of wachtwoord." };
  }
}

export async function signInWithTotp(
  _prevState: unknown,
  formData: FormData,
): Promise<{ error: string } | undefined> {
  const code = (formData.get("code") as string | null)?.trim() ?? "";
  const callbackUrl = formData.get("callbackUrl") as string | null;

  const jar = await cookies();
  const rawToken = jar.get(PENDING_COOKIE)?.value;
  if (!rawToken) {
    redirect("/inloggen?fout=sessie-verlopen");
    return;
  }

  const userId = verifyPendingToken(rawToken);
  if (!userId) {
    redirect("/inloggen?fout=sessie-verlopen");
    return;
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user?.totpEnabled || !user.isEnabled) {
    redirect("/inloggen?fout=sessie-verlopen");
    return;
  }

  // Support recovery codes (format XXXX-XXXX) as fallback when authenticator is unavailable.
  const isRecoveryCode = /^[A-Z2-9]{4}-[A-Z2-9]{4}$/i.test(code);

  if (isRecoveryCode) {
    const allCodes = await db
      .select()
      .from(totpRecoveryCodes)
      .where(and(eq(totpRecoveryCodes.userId, userId), isNull(totpRecoveryCodes.usedAt)));

    let matched: typeof allCodes[0] | undefined;
    for (const rc of allCodes) {
      if (await verifyPassword(code.toUpperCase(), rc.codeHash)) {
        matched = rc;
        break;
      }
    }

    if (!matched) return { error: "Ongeldige herstelcode." };

    await db
      .update(totpRecoveryCodes)
      .set({ usedAt: new Date() })
      .where(eq(totpRecoveryCodes.id, matched.id));

    await createSession(userId, callbackUrl);
    return;
  }

  // Validate the TOTP code directly — the pending cookie already proves the password was verified.
  const { verifyTotpCodeWithCounter, decryptTotpSecretWithFallback, encryptTotpSecret } = await import("@/lib/auth/totp");
  const currentKey = getTotpEncryptionKey();
  const fallbackKey = getTotpFallbackKey();
  const { secret: rawSecret, usedFallback } = decryptTotpSecretWithFallback(
    user.totpSecret!,
    currentKey,
    fallbackKey,
  );
  const matchedCounter = verifyTotpCodeWithCounter(
    rawSecret,
    code,
    user.lastTotpCounter ?? undefined,
  );

  if (matchedCounter === null) {
    return { error: "Ongeldige verificatiecode. Probeer opnieuw." };
  }

  const newTotpSecret = usedFallback ? encryptTotpSecret(rawSecret, currentKey) : undefined;

  await db
    .update(users)
    .set({
      lastTotpCounter: matchedCounter,
      ...(newTotpSecret ? { totpSecret: newTotpSecret } : {}),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  await createSession(userId, callbackUrl);
}

