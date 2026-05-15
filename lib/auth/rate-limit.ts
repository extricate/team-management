import { db } from "@/lib/db";
import { loginRateLimits } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 20;

/**
 * Records an attempt for the given key and returns whether the caller is
 * currently rate-limited. Resets the window after WINDOW_MS.
 *
 * key    — rate-limit bucket (e.g. IP address or "totp:<userId>")
 * maxAttempts — defaults to 20; pass a lower value for sensitive operations
 *
 * Returns true when the attempt should be blocked.
 */
export async function checkLoginRateLimit(key: string, maxAttempts = MAX_ATTEMPTS): Promise<boolean> {
  const now = new Date();
  const windowCutoff = new Date(now.getTime() - WINDOW_MS);

  // Cast dates to timestamptz literals; postgres.js cannot infer the type of raw
  // Date objects inside sql`` template fragments and calls Buffer.from(Date) which throws.
  const nowIso = now.toISOString();
  const cutoffIso = windowCutoff.toISOString();

  // Upsert: insert or increment. If the window has expired, reset it.
  const rows = await db
    .insert(loginRateLimits)
    .values({ key, attempts: 1, windowStart: now })
    .onConflictDoUpdate({
      target: loginRateLimits.key,
      set: {
        attempts: sql`CASE
          WHEN ${loginRateLimits.windowStart} < ${cutoffIso}::timestamptz
          THEN 1
          ELSE ${loginRateLimits.attempts} + 1
        END`,
        windowStart: sql`CASE
          WHEN ${loginRateLimits.windowStart} < ${cutoffIso}::timestamptz
          THEN ${nowIso}::timestamptz
          ELSE ${loginRateLimits.windowStart}
        END`,
      },
    })
    .returning();

  const row = rows[0];
  return row.attempts > maxAttempts;
}
