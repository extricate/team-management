import { redirect } from "next/navigation";
import { Heading, Paragraph } from "@rijkshuisstijl-community/components-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { TotpSetupClient } from "./TotpSetupClient";

export const metadata = { title: "MFA instellen – Teambeheer" };

export default async function MfaPage() {
  const session = await auth();
  if (!session?.user) redirect("/inloggen?callbackUrl=/instellingen/mfa");

  const [user] = await db.select({ totpEnabled: users.totpEnabled })
    .from(users)
    .where(eq(users.id, session.user.id));

  return (
    <main style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
      <Heading level={1}>Twee-factor authenticatie</Heading>

      {user?.totpEnabled ? (
        <div>
          <div style={{ padding: "1rem", marginBottom: "1.5rem", borderLeft: "4px solid var(--rvo-color-groen-600)", background: "var(--rvo-color-groen-100)" }}>
            <Paragraph style={{ margin: 0, fontWeight: "600" }}>MFA is ingeschakeld voor uw account.</Paragraph>
          </div>
          <Paragraph>Neem contact op met een beheerder als u MFA wilt uitschakelen of opnieuw wilt instellen.</Paragraph>
        </div>
      ) : (
        <TotpSetupClient />
      )}
    </main>
  );
}
