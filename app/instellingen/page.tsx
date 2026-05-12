import { redirect } from "next/navigation";
import { Heading, LinkListCard, LinkList, LinkListLink } from "@rijkshuisstijl-community/components-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { organisations } from "@/lib/db/schema";
import { isNull, asc } from "drizzle-orm";
import { DefaultOrgSelector } from "./DefaultOrgSelector";

export const metadata = { title: "Instellingen – Teambeheer" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/inloggen?callbackUrl=/instellingen");

  const isAdmin = session.user.role === "admin";

  const allOrgs = await db
    .select({ id: organisations.id, name: organisations.name })
    .from(organisations)
    .where(isNull(organisations.deletedAt))
    .orderBy(asc(organisations.name));

  return (
    <main style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
      <Heading level={1}>Instellingen</Heading>

      <div style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {allOrgs.length > 0 && (
          <div style={{ border: "1px solid var(--rvo-color-grijs-200)", borderRadius: "4px", padding: "1.5rem" }}>
            <Heading level={2} style={{ margin: "0 0 1rem" }}>Standaard organisatie</Heading>
            <p style={{ margin: "0 0 1rem", fontSize: "0.875rem", color: "var(--rvo-color-grijs-700)" }}>
              Kies een organisatie die automatisch wordt geselecteerd wanneer u een pagina opent.
            </p>
            <DefaultOrgSelector
              organisations={allOrgs}
              currentDefaultId={session.user.defaultOrganisationId}
            />
          </div>
        )}

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
