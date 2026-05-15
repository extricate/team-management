import { createHmac } from "crypto";

function deriveKey(authSecret: string): Buffer {
  return createHmac("sha256", authSecret)
    .update("totp-encryption-key")
    .digest(); // full 32-byte Buffer = 256 bits of entropy for AES-256-GCM
}

// Pre-fix derivation: took 32 hex chars decoded as UTF-8 — only 128 bits of effective entropy.
// Kept to migrate secrets encrypted before the key derivation fix.
function deriveLegacyKey(authSecret: string): Buffer {
  const hexStr = createHmac("sha256", authSecret)
    .update("totp-encryption-key")
    .digest("hex")
    .slice(0, 32);
  return Buffer.from(hexStr, "utf8");
}

/** AES-256-GCM key derived from the current AUTH_SECRET. */
export function getTotpEncryptionKey(): Buffer {
  return deriveKey(process.env.AUTH_SECRET ?? "");
}

/**
 * Optional fallback key derived from AUTH_SECRET_PREVIOUS.
 * Set AUTH_SECRET_PREVIOUS = <old AUTH_SECRET> during a key rotation to allow
 * existing TOTP secrets to be decrypted and lazily re-encrypted with the new key.
 */
export function getTotpFallbackKey(): Buffer | undefined {
  const prev = process.env.AUTH_SECRET_PREVIOUS;
  return prev ? deriveKey(prev) : undefined;
}

/**
 * Legacy keys used only to migrate secrets encrypted before the key derivation fix.
 * Returns [legacyCurrent, legacyPrevious?]. Callers should re-encrypt on successful
 * decryption with any of these keys.
 */
export function getTotpLegacyKeys(): Buffer[] {
  const keys: Buffer[] = [deriveLegacyKey(process.env.AUTH_SECRET ?? "")];
  const prev = process.env.AUTH_SECRET_PREVIOUS;
  if (prev) keys.push(deriveLegacyKey(prev));
  return keys;
}
