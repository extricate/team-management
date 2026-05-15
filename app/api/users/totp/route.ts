import { eq, and, isNull } from "drizzle-orm";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { users, totpRecoveryCodes } from "@/lib/db/schema";
import {
  ok, badRequest, notFound, requireAuth, withErrorHandling,
} from "@/lib/api";
import {
  generateTotpSecret,
  verifyTotpCodeWithCounter,
  getTotpUri,
  encryptTotpSecret,
  decryptTotpSecretWithFallback,
} from "@/lib/auth/totp";
import { getTotpEncryptionKey, getTotpFallbackKey, getTotpLegacyKeys } from "@/lib/auth/totp-key";
import { hashPassword } from "@/lib/auth/password";

function generateRecoveryCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const buf = new Uint8Array(8);
  crypto.getRandomValues(buf);
  for (const b of buf) code += chars[b % chars.length];
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

// POST /api/users/totp  — start TOTP setup for the authenticated user
// Returns a new (unconfirmed) secret + QR URI. Does NOT enable TOTP yet.
export const POST = withErrorHandling(async (_req: Request) => {
  const session = await requireAuth();
  const userId = session.user.id;

  const rawSecret = generateTotpSecret();
  const encryptedSecret = encryptTotpSecret(rawSecret, getTotpEncryptionKey());

  await db.update(users)
    .set({ totpSecret: encryptedSecret, totpEnabled: false, updatedAt: new Date() })
    .where(eq(users.id, userId));

  const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId));
  const uri = getTotpUri(rawSecret, user?.email ?? userId, "Teambeheer");
  const qrSvg = await QRCode.toString(uri, { type: "svg", margin: 1 });

  return ok({ secret: rawSecret, uri, qrSvg });
});

// PUT /api/users/totp  — confirm TOTP setup with a valid code; returns recovery codes
export const PUT = withErrorHandling(async (req: Request) => {
  const session = await requireAuth();
  const userId = session.user.id;
  const body = await req.json();
  const code = (body?.code as string | undefined)?.trim();
  if (!code) return badRequest("Verificatiecode ontbreekt");

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user?.totpSecret) return badRequest("Geen TOTP-configuratie gevonden. Start opnieuw.");

  const currentKey = getTotpEncryptionKey();
  const fallbackKeys = [getTotpFallbackKey(), ...getTotpLegacyKeys()].filter((k): k is Buffer => k !== undefined);
  const { secret: rawSecret } = decryptTotpSecretWithFallback(
    user.totpSecret,
    currentKey,
    fallbackKeys,
  );
  const matchedCounter = verifyTotpCodeWithCounter(rawSecret, code);
  if (matchedCounter === null) return badRequest("Ongeldige verificatiecode.");

  // Enable TOTP and issue 8 recovery codes
  await db.update(users)
    .set({ totpEnabled: true, lastTotpCounter: matchedCounter, updatedAt: new Date() })
    .where(eq(users.id, userId));

  // Remove old unused recovery codes before issuing new ones
  await db.delete(totpRecoveryCodes)
    .where(and(eq(totpRecoveryCodes.userId, userId), isNull(totpRecoveryCodes.usedAt)));

  const plainCodes: string[] = [];
  for (let i = 0; i < 8; i++) {
    const plain = generateRecoveryCode();
    const codeHash = await hashPassword(plain);
    await db.insert(totpRecoveryCodes).values({ userId, codeHash });
    plainCodes.push(plain);
  }

  return ok({ recoveryCodes: plainCodes });
});

// DELETE /api/users/totp  — disable TOTP for the authenticated user (admin can target others)
export const DELETE = withErrorHandling(async (req: Request) => {
  const session = await requireAuth();
  const body = await req.json().catch(() => ({}));
  const targetId: string = body?.userId ?? session.user.id;

  // Only admins may disable another user's TOTP
  if (targetId !== session.user.id && session.user.role !== "admin") {
    return badRequest("Onvoldoende rechten");
  }

  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, targetId));
  if (!user) return notFound("Gebruiker niet gevonden");

  await db.update(users)
    .set({ totpEnabled: false, totpSecret: null, lastTotpCounter: null, updatedAt: new Date() })
    .where(eq(users.id, targetId));

  await db.delete(totpRecoveryCodes).where(eq(totpRecoveryCodes.userId, targetId));

  return ok({ message: "TOTP uitgeschakeld" });
});
