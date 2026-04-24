import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { withErrorHandling, requireAuth, unauthorized, badRequest, created } from "@/lib/api";

export const POST = withErrorHandling(async (req: unknown) => {
  const session = await requireAuth();
  const userId = session.user?.id;
  if (!userId) return unauthorized();

  if (process.env.NODE_ENV !== "development") {
    return unauthorized();
  }

  const adminEmail = "admin@example.com";

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, adminEmail))
    .limit(1);

  let user = existing[0];

  if (!user) {
    const inserted = await db
      .insert(users)
      .values({
        email: adminEmail,
        name: "Administrator",
        role: "admin",
        emailVerified: new Date(),
      })
      .returning();

    user = inserted[0];
  } else {
    await db
      .update(users)
      .set({ emailVerified: new Date() })
      .where(eq(users.email, adminEmail));
  }

  return created({ success: true, user });
}) as (req: Request) => Promise<Response>;