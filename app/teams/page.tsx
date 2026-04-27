import Link from "next/link";
import { redirect } from "next/navigation";
import { Heading } from "@rijkshuisstijl-community/components-react";
import { auth } from "@/lib/auth";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Pagination } from "@/components/ui/Pagination";
import { db } from "@/lib/db";
import { teams } from "@/lib/db/schema";
import { isNull, count } from "drizzle-orm";

const PAGE_SIZE = 25;

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const page = Math.max(1, Number(searchParams?.page) || 1);

  const [{ total }] = await db
    .select({ total: count() })
    .from(teams)
    .where(isNull(teams.deletedAt));

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(1, totalPages));
  const offset = (currentPage - 1) * PAGE_SIZE;

  const pageTeams = await db.query.teams.findMany({
    where: isNull(teams.deletedAt),
    with: { organisation: true, positions: true, memberships: true },
    orderBy: (t, { asc }) => [asc(t.name)],
    limit: PAGE_SIZE,
    offset,
  });

  const from = offset + 1;
  const to = Math.min(offset + PAGE_SIZE, total);

  return (
    <div>
      <Breadcrumbs crumbs={[{ label: "Teams" }]} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <Heading level={1} style={{ margin: 0 }}>Teams</Heading>
        <Link href="/teams/nieuw" className="utrecht-button utrecht-button--primary-action">
          + Nieuw team
        </Link>
      </div>

      {total > 0 && (
        <p style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", color: "var(--rvo-color-grijs-600)" }}>
          {total === 1
            ? "1 team"
            : `${from}–${to} van ${total} teams`}
        </p>
      )}

      <table className="utrecht-table">
        <thead className="utrecht-table__header">
          <tr className="utrecht-table__row">
            <th className="utrecht-table__header-cell">Teamnaam</th>
            <th className="utrecht-table__header-cell">Organisatie</th>
            <th className="utrecht-table__header-cell">Medewerkers</th>
            <th className="utrecht-table__header-cell">Posities</th>
            <th className="utrecht-table__header-cell">Bezet</th>
            <th className="utrecht-table__header-cell">Acties</th>
          </tr>
        </thead>
        <tbody className="utrecht-table__body">
          {pageTeams.length === 0 && (
            <tr className="utrecht-table__row">
              <td className="utrecht-table__cell" colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "var(--rvo-color-grijs-600)" }}>
                Nog geen teams aangemaakt.
              </td>
            </tr>
          )}
          {pageTeams.map((team) => {
            const activeMembers   = team.memberships.filter(m => m.status === "active" && !m.endDate).length;
            const totalPositions  = team.positions.filter(p => !p.deletedAt).length;
            const filledPositions = team.positions.filter(p => p.status === "filled" && !p.deletedAt).length;

            return (
              <tr key={team.id} className="utrecht-table__row">
                <td className="utrecht-table__cell">
                  <Link href={`/teams/${team.id}`} className="utrecht-link" style={{ fontWeight: 600 }}>
                    {team.name}
                  </Link>
                </td>
                <td className="utrecht-table__cell">{team.organisation.name}</td>
                <td className="utrecht-table__cell">{activeMembers}</td>
                <td className="utrecht-table__cell">{totalPositions}</td>
                <td className="utrecht-table__cell">
                  <span style={{ color: filledPositions === totalPositions && totalPositions > 0 ? "var(--rvo-color-groen-600)" : "inherit" }}>
                    {filledPositions}/{totalPositions}
                  </span>
                </td>
                <td className="utrecht-table__cell" style={{ display: "flex", gap: "1rem" }}>
                  <Link href={`/teams/${team.id}`} className="utrecht-link">Bekijken</Link>
                  <Link href={`/teams/${team.id}/bewerken`} className="utrecht-link">Bewerken</Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        buildHref={(p) => `/teams?page=${p}`}
      />
    </div>
  );
}
