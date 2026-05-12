import { redirect } from "next/navigation";
import { Heading, LinkListCard, LinkList, LinkListLink } from "@rijkshuisstijl-community/components-react";
import { auth } from "@/lib/auth";

export const metadata = { title: "Instellingen – Teambeheer" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/inloggen?callbackUrl=/instellingen");

  const isAdmin = session.user.role === "admin";

  return (
    <main style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
      <Heading level={1}>Instellingen</Heading>

      <div style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <LinkListCard headingLevel={2} heading="Beveiliging">
          <LinkList>
            <LinkListLink href="/instellingen/mfa">Twee-factor authenticatie</LinkListLink>
          </LinkList>
        </LinkListCard>

        {isAdmin && (
          <LinkListCard headingLevel={2} heading="Beheer">
            <LinkList>
              <LinkListLink href="/beheer/gebruikers">Gebruikersbeheer</LinkListLink>
            </LinkList>
          </LinkListCard>
        )}
      </div>
    </main>
  );
}
