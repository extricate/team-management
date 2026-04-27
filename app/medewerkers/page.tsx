import Link from "next/link";
import { redirect } from "next/navigation";
import { Heading } from "@rijkshuisstijl-community/components-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { employees } from "@/lib/db/schema";
import { isNull, count } from "drizzle-orm";
import { formatFullName } from "@/lib/utils";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Pagination } from "@/components/ui/Pagination";

const PAGE_SIZE = 50;

export default async function MedewerkersPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const page = Math.max(1, Number(searchParams?.page) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [{ total }] = await db
    .select({ total: count() })
    .from(employees)
    .where(isNull(employees.deletedAt));

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(1, totalPages));

  const pageEmployees = await db.query.employees.findMany({
    where: isNull(employees.deletedAt),
    with: {
      organisation: true,
      memberships: { with: { team: true } },
      positionAssignments: { with: { position: true } },
    },
    orderBy: (e, { asc }) => [asc(e.lastName), asc(e.firstName)],
    limit: PAGE_SIZE,
    offset: (currentPage - 1) * PAGE_SIZE,
  });

  const from = offset + 1;
  const to = Math.min(offset + PAGE_SIZE, total);

  return (
    <div>
      <Breadcrumbs crumbs={[{ label: "Medewerkers" }]} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <Heading level={1} style={{ margin: 0 }}>Medewerkers</Heading>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Link href="/medewerkers/bulk-import" className="utrecht-button utrecht-button--secondary-action">
            Bulk importeren
          </Link>
          <Link href="/medewerkers/nieuw" className="utrecht-button utrecht-button--primary-action">
            + Nieuwe medewerker
          </Link>
        </div>
      </div>

      {total > 0 && (
        <p style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", color: "var(--rvo-color-grijs-600)" }}>
          {total === 1
            ? "1 medewerker"
            : `${from}–${to} van ${total} medewerkers`}
        </p>
      )}

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
          {pageEmployees.length === 0 && (
            <tr className="utrecht-table__row">
              <td className="utrecht-table__cell" colSpan={5} style={{ textAlign: "center", padding: "2rem", color: "var(--rvo-color-grijs-600)" }}>
                Nog geen medewerkers aangemaakt.
              </td>
            </tr>
          )}
          {pageEmployees.map((emp) => {
            const fullName    = formatFullName(emp);
            const activeTeams = emp.memberships.filter(m => m.status === "active" && !m.endDate);
            const activePos   = emp.positionAssignments.find(a => a.status === "active");

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

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        buildHref={(p) => `/medewerkers?page=${p}`}
      />
    </div>
  );
}
