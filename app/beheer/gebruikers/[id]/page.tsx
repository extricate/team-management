import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { Heading, Paragraph } from "@rijkshuisstijl-community/components-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, organisations } from "@/lib/db/schema";
import { eq, isNull } from "drizzle-orm";
import { EditGebruikerForm } from "./EditGebruikerForm";
import { updateUser, disableTotp } from "./actions";

export const metadata = { title: "Gebruiker bewerken – Teambeheer" };

export default async function GebruikerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/inloggen");
  if (session.user.role !== "admin") redirect("/dashboard");

  const { id } = await params;
  const [user] = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    isEnabled: users.isEnabled,
    totpEnabled: users.totpEnabled,
    organisationId: users.organisationId,
  }).from(users).where(eq(users.id, id));

  if (!user) notFound();

  const allOrgs = await db.select({ id: organisations.id, name: organisations.name })
    .from(organisations)
    .where(isNull(organisations.deletedAt))
    .orderBy(organisations.name);

  // Bind the userId into the action
  const boundUpdateUser = updateUser.bind(null, id);
  const boundDisableTotp = disableTotp.bind(null, id);

  return (
    <main style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
      <div style={{ marginBottom: "0.5rem" }}>
        <Link href="/beheer/gebruikers" style={{ fontSize: "0.9em", color: "var(--rvo-color-grijs-600)" }}>
          ← Gebruikersbeheer
        </Link>
      </div>

      <Heading level={1}>Gebruiker bewerken</Heading>
      <Paragraph style={{ marginBottom: "2rem", color: "var(--rvo-color-grijs-600)" }}>{user.email}</Paragraph>

      <EditGebruikerForm user={user} organisations={allOrgs} action={boundUpdateUser} />

      <section style={{ marginTop: "3rem", paddingTop: "1.5rem", borderTop: "1px solid var(--rvo-color-grijs-300)" }}>
        <Heading level={2}>Twee-factor authenticatie</Heading>
        {user.totpEnabled ? (
          <>
            <Paragraph style={{ color: "var(--rvo-color-groen-700)" }}>✓ MFA is ingeschakeld voor dit account.</Paragraph>
            <form action={boundDisableTotp}>
              <button type="submit" className="utrecht-button utrecht-button--secondary-action"
                style={{ borderColor: "var(--rvo-color-rood-600)", color: "var(--rvo-color-rood-700)" }}>
                MFA uitschakelen
              </button>
            </form>
          </>
        ) : (
          <Paragraph style={{ color: "var(--rvo-color-grijs-600)" }}>
            MFA is niet ingesteld. De gebruiker kan MFA instellen via Accountinstellingen na inloggen.
          </Paragraph>
        )}
      </section>

      <section style={{ marginTop: "3rem", paddingTop: "1.5rem", borderTop: "1px solid var(--rvo-color-grijs-300)" }}>
        <Heading level={2}>TOTP instellen voor gebruiker</Heading>
        <Paragraph>
          Stuur de gebruiker naar <strong>/instellingen/mfa</strong> om TOTP zelf in te stellen met hun authenticator-app.
        </Paragraph>
      </section>
    </main>
  );
}
