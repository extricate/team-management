import { db } from "@/lib/db";
import { loginRateLimits } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 20;

/**
 * Records a login attempt for the given key (IP address) and returns whether
 * the caller is currently rate-limited. Resets the window after WINDOW_MS.
 *
 * Returns true when the attempt should be blocked.
 */
export async function checkLoginRateLimit(key: string): Promise<boolean> {
  const now = new Date();
  const windowCutoff = new Date(now.getTime() - WINDOW_MS);

  // Upsert: insert or increment. If the window has expired, reset it.
  const rows = await db
    .insert(loginRateLimits)
    .values({ key, attempts: 1, windowStart: now })
    .onConflictDoUpdate({
      target: loginRateLimits.key,
      set: {
        attempts: sql`CASE
          WHEN ${loginRateLimits.windowStart} < ${windowCutoff}
          THEN 1
          ELSE ${loginRateLimits.attempts} + 1
        END`,
        windowStart: sql`CASE
          WHEN ${loginRateLimits.windowStart} < ${windowCutoff}
          THEN ${now}
          ELSE ${loginRateLimits.windowStart}
        END`,
      },
    })
    .returning();

  const row = rows[0];
  return row.attempts > MAX_ATTEMPTS;
}
