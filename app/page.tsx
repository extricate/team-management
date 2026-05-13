import Link from "next/link";
import { redirect } from "next/navigation";
import { Heading, Paragraph } from "@rijkshuisstijl-community/components-react";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div>
      <Heading level={1}>Welkom bij Teambeheer</Heading>
      <Paragraph>Beheer uw teams, medewerkers en rollen op één centrale plek.</Paragraph>
      <div style={{ marginTop: "2rem" }}>
        <Link href="/inloggen" className="utrecht-button utrecht-button--primary-action">
          Inloggen
        </Link>
      </div>
    </div>
  );
}
