import Link from "next/link";
import { redirect } from "next/navigation";
import { Heading, Paragraph } from "@rijkshuisstijl-community/components-react";
import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const cards = [
    { href: "/organisaties", title: "Organisaties",  desc: "Beheer organisaties en hun structuur." },
    { href: "/teams",        title: "Teams",          desc: "Beheer teams en teamleden." },
    { href: "/medewerkers",  title: "Medewerkers",    desc: "Bekijk en beheer medewerkers." },
    { href: "/financiering", title: "Financiering",   desc: "Beheer financieringsbronnen en allocaties." },
  ];

  return (
    <div>
      <Heading level={1}>Dashboard</Heading>
      <Paragraph>
        Welkom terug, <strong>{session.user.name ?? session.user.email}</strong>.
      </Paragraph>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1.5rem", marginTop: "2rem" }}>
        {cards.map(({ href, title, desc }) => (
          <div key={href} className="utrecht-card">
            <Heading level={2} style={{ fontSize: "1.125rem", marginBottom: "0.5rem" }}>{title}</Heading>
            <Paragraph style={{ marginBottom: "1rem" }}>{desc}</Paragraph>
            <Link href={href} className="utrecht-link">Naar {title.toLowerCase()} →</Link>
          </div>
        ))}
      </div>
    </div>
  );
}
