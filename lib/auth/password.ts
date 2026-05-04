import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

// OWASP-recommended scrypt parameters (N=2^15, r=8, p=1).
// maxmem is set explicitly because OpenSSL 3 defaults to 32MB — exactly
// what N=32768 requires — so we give it headroom.
const N = 32768;
const r = 8;
const p = 1;
const KEYLEN = 64;
const SALT_BYTES = 32;
const MAXMEM = 64 * 1024 * 1024;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const hash = await scryptAsync(password, salt, KEYLEN, { N, r, p, maxmem: MAXMEM }) as Buffer;
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 2) return false;
  const [saltHex, hashHex] = parts;
  if (saltHex.length !== SALT_BYTES * 2 || hashHex.length !== KEYLEN * 2) return false;
  try {
    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(hashHex, "hex");
    const actual = await scryptAsync(password, salt, KEYLEN, { N, r, p, maxmem: MAXMEM }) as Buffer;
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
