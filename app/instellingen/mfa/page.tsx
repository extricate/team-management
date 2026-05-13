import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert, Heading, Paragraph } from "@rijkshuisstijl-community/components-react";
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
    <div style={{ maxWidth: "600px" }}>
      <Link href="/instellingen" className="utrecht-link">
        Terug naar instellingen
      </Link>
      <Heading level={1} style={{ marginTop: "1rem" }}>Twee-factor authenticatie</Heading>

      {user?.totpEnabled ? (
        <div>
          <Alert type="ok" style={{ marginBottom: "1.5rem" }}>
            <Paragraph><strong>MFA is ingeschakeld voor uw account.</strong></Paragraph>
          </Alert>
          <Paragraph>Neem contact op met een beheerder als u MFA wilt uitschakelen of opnieuw wilt instellen.</Paragraph>
        </div>
      ) : (
        <TotpSetupClient />
      )}
    </div>
  );
}
