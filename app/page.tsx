import Link from "next/link";
import { Heading, Paragraph } from "@rijkshuisstijl-community/components-react";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();

  return (
    <div>
      <Heading level={1}>Welkom bij Teambeheer</Heading>
      <Paragraph>Beheer uw teams, medewerkers en rollen op één centrale plek.</Paragraph>

      {session?.user ? (
        <div style={{ marginTop: "2rem" }}>
          <Paragraph>Ingelogd als <strong>{session.user.email}</strong>.</Paragraph>
          <Link href="/dashboard" className="utrecht-button utrecht-button--primary-action">
            Ga naar dashboard
          </Link>
        </div>
      ) : (
        <div style={{ marginTop: "2rem" }}>
          <Link href="/inloggen" className="utrecht-button utrecht-button--primary-action">
            Inloggen
          </Link>
        </div>
      )}
    </div>
  );
}
