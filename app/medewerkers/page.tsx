import Link from "next/link";
import { redirect } from "next/navigation";
import { Heading } from "@rijkshuisstijl-community/components-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { employees } from "@/lib/db/schema";
import { isNull } from "drizzle-orm";

export default async function MedewerkersPage() {
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const allEmployees = await db.query.employees.findMany({
    where: isNull(employees.deletedAt),
    with: {
      organisation: true,
      memberships: { with: { team: true } },
      positionAssignments: { with: { position: true } },
    },
    orderBy: (e, { asc }) => [asc(e.lastName), asc(e.firstName)],
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <Heading level={1} style={{ margin: 0 }}>Medewerkers</Heading>
        <Link href="/medewerkers/nieuw" className="utrecht-button utrecht-button--primary-action">
          + Nieuwe medewerker
        </Link>
      </div>

      <table className="utrecht-table">
        <thead className="utrecht-table__header">
          <tr className="utrecht-table__row">
            <th className="utrecht-table__header-cell">Naam</th>
            <th className="utrecht-table__header-cell">Organisatie</th>
            <th className="utrecht-table__header-cell">Teams</th>
            <th className="utrecht-table__header-cell">Huidige positie</th>
            <th className="utrecht-table__header-cell">Acties</th>
          </tr>
        </thead>
        <tbody className="utrecht-table__body">
          {allEmployees.length === 0 && (
            <tr className="utrecht-table__row">
              <td className="utrecht-table__cell" colSpan={5} style={{ textAlign: "center", padding: "2rem", color: "var(--rvo-color-grijs-600)" }}>
                Nog geen medewerkers aangemaakt.
              </td>
            </tr>
          )}
          {allEmployees.map((emp) => {
            const fullName      = emp.prefixName ? `${emp.firstName} ${emp.prefixName} ${emp.lastName}` : `${emp.firstName} ${emp.lastName}`;
            const activeTeams   = emp.memberships.filter(m => m.status === "active" && !m.endDate);
            const activePos     = emp.positionAssignments.find(a => a.status === "active");

            return (
              <tr key={emp.id} className="utrecht-table__row">
                <td className="utrecht-table__cell">
                  <Link href={`/medewerkers/${emp.id}`} className="utrecht-link" style={{ fontWeight: 600 }}>{fullName}</Link>
                </td>
                <td className="utrecht-table__cell">{emp.organisation.name}</td>
                <td className="utrecht-table__cell">
                  {activeTeams.length === 0
                    ? <span style={{ color: "var(--rvo-color-grijs-500)" }}>Geen</span>
                    : activeTeams.map(m => m.team.name).join(", ")}
                </td>
                <td className="utrecht-table__cell">
                  {activePos ? activePos.position.type : <span style={{ color: "var(--rvo-color-grijs-500)" }}>Geen</span>}
                </td>
                <td className="utrecht-table__cell" style={{ display: "flex", gap: "1rem" }}>
                  <Link href={`/medewerkers/${emp.id}`} className="utrecht-link">Bekijken</Link>
                  <Link href={`/medewerkers/${emp.id}/bewerken`} className="utrecht-link">Bewerken</Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
