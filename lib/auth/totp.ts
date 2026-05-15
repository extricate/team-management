import { createHmac, randomBytes, createCipheriv, createDecipheriv } from "crypto";

// ── Base32 ─────────────────────────────────────────────────────────────────────

const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Decode(s: string): Buffer {
  const normalized = s.toUpperCase().replace(/=+$/, "");
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  for (const ch of normalized) {
    const idx = BASE32_CHARS.indexOf(ch);
    if (idx === -1) throw new Error(`Invalid base32 character: ${ch}`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >> bits) & 0xff);
    }
  }
  return Buffer.from(bytes);
}

function base32Encode(buf: Buffer): string {
  let result = "";
  let bits = 0;
  let value = 0;
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      result += BASE32_CHARS[(value >> bits) & 0x1f];
    }
  }
  if (bits > 0) result += BASE32_CHARS[(value << (5 - bits)) & 0x1f];
  // Pad to multiple of 8
  while (result.length % 8 !== 0) result += "=";
  return result;
}

// ── TOTP (RFC 6238 / HOTP RFC 4226) ───────────────────────────────────────────

export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20)); // 160-bit secret
}

export function generateTotpCode(secret: string, counter: number): string {
  const key = base32Decode(secret);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", key).update(buf).digest();
  const offset = hmac[19] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24 |
      (hmac[offset + 1] & 0xff) << 16 |
      (hmac[offset + 2] & 0xff) << 8 |
      (hmac[offset + 3] & 0xff)) % 1_000_000;
  return code.toString().padStart(6, "0");
}

// window=1 accepts one step behind current (clock-skew tolerance).
// lastUsedCounter rejects replay within the same window.
export function verifyTotpCode(
  secret: string,
  code: string,
  lastUsedCounter?: number,
): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  const current = Math.floor(Date.now() / 1000 / 30);
  for (let delta = -1; delta <= 0; delta++) {
    const counter = current + delta;
    if (lastUsedCounter !== undefined && counter <= lastUsedCounter) continue;
    if (generateTotpCode(secret, counter) === code) return true;
  }
  return false;
}

// Returns the counter that matched, so callers can persist it for replay prevention.
export function verifyTotpCodeWithCounter(
  secret: string,
  code: string,
  lastUsedCounter?: number,
): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const current = Math.floor(Date.now() / 1000 / 30);
  for (let delta = -1; delta <= 0; delta++) {
    const counter = current + delta;
    if (lastUsedCounter !== undefined && counter <= lastUsedCounter) continue;
    if (generateTotpCode(secret, counter) === code) return counter;
  }
  return null;
}

export function getTotpUri(secret: string, accountName: string, issuer: string): string {
  return (
    `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}` +
    `?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`
  );
}

// ── TOTP secret encryption (AES-256-GCM) ──────────────────────────────────────
// key must be a 32-byte Buffer (from getTotpEncryptionKey / getTotpFallbackKey).

export function encryptTotpSecret(secret: string, key: Buffer): string {
  const iv = randomBytes(12); // 12 bytes is the GCM standard IV size
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

function decryptWithKey(stored: string, key: Buffer): string {
  const parts = stored.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted TOTP secret format");
  const [ivB64, authTagB64, cipherB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const ciphertext = Buffer.from(cipherB64, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(ciphertext).toString("utf8") + decipher.final("utf8");
}

export function decryptTotpSecret(stored: string, key: Buffer): string {
  return decryptWithKey(stored, key);
}

/**
 * Tries the primary key first; then each fallbackKey in order.
 * Returns the decrypted secret and whether a fallback was used — callers
 * should re-encrypt and persist the secret when usedFallback is true.
 * fallbackKeys should include both AUTH_SECRET_PREVIOUS-derived keys and
 * legacy keys (from getTotpLegacyKeys) to cover all migration paths.
 */
export function decryptTotpSecretWithFallback(
  stored: string,
  key: Buffer,
  fallbackKeys: Buffer[],
): { secret: string; usedFallback: boolean } {
  try {
    return { secret: decryptWithKey(stored, key), usedFallback: false };
  } catch {
    for (const fallback of fallbackKeys) {
      try {
        return { secret: decryptWithKey(stored, fallback), usedFallback: true };
      } catch {
        // try next key
      }
    }
    throw new Error("TOTP secret decryption failed with all available keys");
  }
}
