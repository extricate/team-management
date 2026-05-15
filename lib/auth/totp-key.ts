import { createHmac } from "crypto";

function deriveKey(authSecret: string): string {
  return createHmac("sha256", authSecret)
    .update("totp-encryption-key")
    .digest("hex")
    .slice(0, 32);
}

/** AES-256-GCM key derived from the current AUTH_SECRET. */
export function getTotpEncryptionKey(): string {
  return deriveKey(process.env.AUTH_SECRET ?? "");
}

/**
 * Optional fallback key derived from AUTH_SECRET_PREVIOUS.
 * Set AUTH_SECRET_PREVIOUS = <old AUTH_SECRET> during a key rotation to allow
 * existing TOTP secrets to be decrypted and lazily re-encrypted with the new key.
 */
export function getTotpFallbackKey(): string | undefined {
  const prev = process.env.AUTH_SECRET_PREVIOUS;
  return prev ? deriveKey(prev) : undefined;
}
