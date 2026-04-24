import Link from "next/link";
import { redirect } from "next/navigation";
import { Heading } from "@rijkshuisstijl-community/components-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { organisations } from "@/lib/db/schema";
import { isNull } from "drizzle-orm";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default async function OrganisatiesPage() {
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const orgs = await db.query.organisations.findMany({
    where: isNull(organisations.deletedAt),
    with: { teams: true, employees: true },
    orderBy: (o, { asc }) => [asc(o.name)],
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <Heading level={1} style={{ margin: 0 }}>Organisaties</Heading>
        <Link href="/organisaties/nieuw" className="utrecht-button utrecht-button--primary-action">
          + Nieuwe organisatie
        </Link>
      </div>

      <table className="utrecht-table">
        <thead className="utrecht-table__header">
          <tr className="utrecht-table__row">
            <th className="utrecht-table__header-cell">Naam</th>
            <th className="utrecht-table__header-cell">Type</th>
            <th className="utrecht-table__header-cell">Teams</th>
            <th className="utrecht-table__header-cell">Medewerkers</th>
            <th className="utrecht-table__header-cell">Acties</th>
          </tr>
        </thead>
        <tbody className="utrecht-table__body">
          {orgs.length === 0 && (
            <tr className="utrecht-table__row">
              <td className="utrecht-table__cell" colSpan={5} style={{ textAlign: "center", padding: "2rem", color: "var(--rvo-color-grijs-600)" }}>
                Nog geen organisaties aangemaakt.
              </td>
            </tr>
          )}
          {orgs.map((org) => (
            <tr key={org.id} className="utrecht-table__row">
              <td className="utrecht-table__cell">
                <Link href={`/organisaties/${org.id}`} className="utrecht-link" style={{ fontWeight: 600 }}>
                  {org.name}
                </Link>
              </td>
              <td className="utrecht-table__cell"><StatusBadge label={org.type} color="blue" /></td>
              <td className="utrecht-table__cell">{org.teams.filter(t => !t.deletedAt).length}</td>
              <td className="utrecht-table__cell">{org.employees.filter(e => !e.deletedAt).length}</td>
              <td className="utrecht-table__cell">
                <Link href={`/organisaties/${org.id}/bewerken`} className="utrecht-link">Bewerken</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
