"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { users, sessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

function sanitizeRedirect(url?: string | null): string {
  if (url && url.startsWith("/") && !url.startsWith("//")) return url;
  return "/dashboard";
}

export async function devSignIn(formData: FormData) {
  if (process.env.NODE_ENV !== "development") return;

  const callbackUrl = formData.get("callbackUrl") as string | null;
  const adminEmail = "admin@example.com";

  let [user] = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);

  if (!user) {
    [user] = await db.insert(users).values({
      email: adminEmail,
      name: "Administrator",
      role: "admin",
      emailVerified: new Date(),
    }).returning();
  }

  const sessionToken = crypto.randomUUID();
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await db.insert(sessions).values({ sessionToken, userId: user.id, expires });

  cookies().set("authjs.session-token", sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires,
  });

  redirect(sanitizeRedirect(callbackUrl));
}
