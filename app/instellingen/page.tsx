import { redirect } from "next/navigation";
import { Heading, Paragraph } from "@rijkshuisstijl-community/components-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const metadata = { title: "Instellingen – Teambeheer" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/inloggen?callbackUrl=/instellingen/mfa");

  const [user] = await db.select({ totpEnabled: users.totpEnabled })
    .from(users)
    .where(eq(users.id, session.user.id));

  return (
    <main style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
      <Heading level={1}>Instellingen</Heading>
    </main>
  );
}
