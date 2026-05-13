import { redirect } from "next/navigation";
import Link from "next/link";
import { Heading, Paragraph } from "@rijkshuisstijl-community/components-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export const metadata = { title: "Gebruikersbeheer – Teambeheer" };

export default async function GebruikersPage() {
  const session = await auth();
  if (!session?.user) redirect("/inloggen?callbackUrl=/beheer/gebruikers");
  if (session.user.role !== "admin") redirect("/dashboard");

  const allUsers = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    isEnabled: users.isEnabled,
    totpEnabled: users.totpEnabled,
    createdAt: users.createdAt,
  }).from(users).orderBy(users.createdAt);

  return (
    <div>
      <Breadcrumbs crumbs={[
        { label: "Instellingen", href: "/instellingen" },
        { label: "Gebruikersbeheer" },
      ]} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <Heading level={1} style={{ margin: 0 }}>Gebruikersbeheer</Heading>
        <Link href="/beheer/gebruikers/nieuw" className="utrecht-button utrecht-button--primary-action">
          Nieuw account
        </Link>
      </div>

      <table className="utrecht-table">
        <thead className="utrecht-table__header">
          <tr className="utrecht-table__row">
            <th className="utrecht-table__header-cell">Naam / E-mail</th>
            <th className="utrecht-table__header-cell">Rol</th>
            <th className="utrecht-table__header-cell">Status</th>
            <th className="utrecht-table__header-cell">MFA</th>
            <th className="utrecht-table__header-cell" />
          </tr>
        </thead>
        <tbody className="utrecht-table__body">
          {allUsers.map((u) => (
            <tr key={u.id} className="utrecht-table__row">
              <td className="utrecht-table__cell">
                <div style={{ fontWeight: 600 }}>{u.name ?? "—"}</div>
                <div style={{ fontSize: "0.85em", color: "var(--rvo-color-grijs-600, #5a5a5a)" }}>{u.email}</div>
              </td>
              <td className="utrecht-table__cell">{u.role}</td>
              <td className="utrecht-table__cell">
                <StatusBadge label={u.isEnabled ? "Actief" : "Uitgeschakeld"} color={u.isEnabled ? "green" : "grey"} />
              </td>
              <td className="utrecht-table__cell">
                <StatusBadge label={u.totpEnabled ? "Ingeschakeld" : "Niet ingesteld"} color={u.totpEnabled ? "green" : "grey"} />
              </td>
              <td className="utrecht-table__cell" style={{ textAlign: "right" }}>
                <Link href={`/beheer/gebruikers/${u.id}`} className="utrecht-link">
                  Bewerken
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {allUsers.length === 0 && (
        <Paragraph>Geen gebruikers gevonden.</Paragraph>
      )}
    </div>
  );
}
