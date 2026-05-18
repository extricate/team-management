import { redirect } from "next/navigation";
import { Heading, Paragraph, Card, LinkListCard, LinkList, LinkListLink } from "@rijkshuisstijl-community/components-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { organisations } from "@/lib/db/schema";
import { isNull, asc } from "drizzle-orm";
import { DefaultOrgSelector } from "./DefaultOrgSelector";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

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
    <div>
      <Breadcrumbs crumbs={[{ label: "Instellingen" }]} />
      <Heading level={1}>Instellingen</Heading>

      <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {allOrgs.length > 0 && (
          <Card heading="Standaard organisatie" headingLevel={2} style={{ maxInlineSize: "none", width: "100%" }}>
            <Paragraph>
              Kies een organisatie die automatisch wordt geselecteerd wanneer u een pagina opent.
            </Paragraph>
            <DefaultOrgSelector
              organisations={allOrgs}
              currentDefaultId={session.user.defaultOrganisationId}
            />
          </Card>
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
              <LinkListLink href="/beheer/salarisschalen">Salarisschalen</LinkListLink>
              <LinkListLink href="/beheer/functies">Functies</LinkListLink>
            </LinkList>
          </LinkListCard>
        )}
      </div>
    </div>
  );
}
