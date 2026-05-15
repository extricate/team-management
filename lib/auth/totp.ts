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
// key must be exactly 32 bytes (as hex or a 32-char string).

export function encryptTotpSecret(secret: string, key: string): string {
  const keyBuf = Buffer.from(key.padEnd(32, "\0").slice(0, 32), "utf8");
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", keyBuf, iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

function decryptWithKey(stored: string, key: string): string {
  const parts = stored.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted TOTP secret format");
  const [ivB64, authTagB64, cipherB64] = parts;
  const keyBuf = Buffer.from(key.padEnd(32, "\0").slice(0, 32), "utf8");
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const ciphertext = Buffer.from(cipherB64, "base64");
  const decipher = createDecipheriv("aes-256-gcm", keyBuf, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(ciphertext).toString("utf8") + decipher.final("utf8");
}

export function decryptTotpSecret(stored: string, key: string): string {
  return decryptWithKey(stored, key);
}

/**
 * Tries the current key first; falls back to fallbackKey if provided.
 * Returns the decrypted secret and whether the fallback was used — callers
 * should re-encrypt and persist the secret when usedFallback is true.
 */
export function decryptTotpSecretWithFallback(
  stored: string,
  key: string,
  fallbackKey: string | undefined,
): { secret: string; usedFallback: boolean } {
  try {
    return { secret: decryptWithKey(stored, key), usedFallback: false };
  } catch {
    if (fallbackKey) {
      return { secret: decryptWithKey(stored, fallbackKey), usedFallback: true };
    }
    throw new Error("TOTP secret decryption failed with all available keys");
  }
}
