import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Heading } from "@rijkshuisstijl-community/components-react";
import { auth } from "@/lib/auth";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Pagination } from "@/components/ui/Pagination";
import { SortHeader } from "@/components/ui/SortHeader";
import { db } from "@/lib/db";
import { teams, organisations } from "@/lib/db/schema";
import { isNull, count, ilike, eq, asc, desc } from "drizzle-orm";

export const metadata: Metadata = { title: "Teams – Teambeheer" };

const PAGE_SIZE = 25;
type SortCol = "name" | "organisation" | "members" | "positions" | "filled";

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; sort?: string; order?: string; q?: string; orgId?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const { page: pageParam, sort: sortParam, order: orderParam, q, orgId } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const sortCol = (["name", "organisation", "members", "positions", "filled"].includes(sortParam ?? "") ? sortParam : "name") as SortCol;
  const sortOrder = orderParam === "desc" ? "desc" : "asc";

  const allOrgs = await db.select({ id: organisations.id, name: organisations.name }).from(organisations).where(isNull(organisations.deletedAt)).orderBy(asc(organisations.name));

  // When no orgId param is present, fall back to the user's default organisation.
  const effectiveOrgId = orgId ?? session.user.defaultOrganisationId ?? undefined;

  // Build base where condition
  const whereConditions = [isNull(teams.deletedAt)];
  if (q) whereConditions.push(ilike(teams.name, `%${q}%`));
  if (effectiveOrgId) whereConditions.push(eq(teams.organisationId, effectiveOrgId));

  const { and } = await import("drizzle-orm");
  const whereClause = and(...whereConditions);

  const [{ total }] = await db.select({ total: count() }).from(teams).where(whereClause);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(1, totalPages));
  const offset = (currentPage - 1) * PAGE_SIZE;

  const orderFn = sortOrder === "asc" ? asc : desc;
  const orderByClause = sortCol === "organisation"
    ? [orderFn(organisations.name), asc(teams.name)]
    : [orderFn(teams.name)];

  const pageTeams = await db.query.teams.findMany({
    where: whereClause,
    with: { organisation: true, positions: true, memberships: true },
    orderBy: orderByClause,
    limit: PAGE_SIZE,
    offset,
  });

  const from = offset + 1;
  const to = Math.min(offset + PAGE_SIZE, total);

  function buildSortHref(col: string, order: "asc" | "desc") {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (orgId) p.set("orgId", orgId);
    p.set("sort", col);
    p.set("order", order);
    return `/teams?${p}`;
  }

  function filterHref(params: Record<string, string>) {
    const p = new URLSearchParams(params);
    return `/teams?${p}`;
  }

  return (
    <div>
      <Breadcrumbs crumbs={[{ label: "Teams" }]} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <Heading level={1} style={{ margin: 0 }}>Teams</Heading>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Link href="/teams/nieuw" className="utrecht-button utrecht-button--primary-action">+ Nieuw team</Link>
          <Link href="/bezetting" className="utrecht-button utrecht-button--secondary-action">Bezetting</Link>
          <Link href="/indelen" className="utrecht-button utrecht-button--secondary-action">Indeling</Link>
        </div>
      </div>

      {/* Filters */}
      <form method="get" action="/teams" style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <label htmlFor="q" style={{ display: "block", fontSize: "0.8125rem", marginBottom: "0.25rem", color: "var(--rvo-color-grijs-700)" }}>Zoeken</label>
          <input id="q" name="q" type="search" defaultValue={q ?? ""} placeholder="Teamnaam…" className="utrecht-textbox" style={{ width: "200px" }} />
        </div>
        <div>
          <label htmlFor="orgId" style={{ display: "block", fontSize: "0.8125rem", marginBottom: "0.25rem", color: "var(--rvo-color-grijs-700)" }}>Organisatie</label>
          <select id="orgId" name="orgId" className="utrecht-select" defaultValue={effectiveOrgId ?? ""}>
            <option value="">Alle organisaties</option>
            {allOrgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
        {sortCol !== "name" || sortOrder !== "asc" ? (
          <input type="hidden" name="sort" value={sortCol} />
        ) : null}
        {sortOrder !== "asc" ? <input type="hidden" name="order" value={sortOrder} /> : null}
        <button type="submit" className="utrecht-button utrecht-button--secondary-action">Filteren</button>
        {(q || orgId) && (
          <Link href="/teams" className="utrecht-link" style={{ alignSelf: "flex-end", paddingBottom: "0.25rem", fontSize: "0.875rem" }}>× Wis filter</Link>
        )}
      </form>

      {total > 0 && (
        <p style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", color: "var(--rvo-color-grijs-600)" }}>
          {total === 1 ? "1 team" : `${from}–${to} van ${total} teams`}
        </p>
      )}

      <table className="utrecht-table">
        <thead className="utrecht-table__header">
          <tr className="utrecht-table__row">
            <SortHeader label="Teamnaam" column="name" currentSort={sortCol} currentOrder={sortOrder} buildHref={buildSortHref} />
            <SortHeader label="Organisatie" column="organisation" currentSort={sortCol} currentOrder={sortOrder} buildHref={buildSortHref} />
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
                {q || orgId ? "Geen teams gevonden voor dit filter." : "Nog geen teams aangemaakt."}
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
                  <Link href={`/teams/${team.id}`} className="utrecht-link" style={{ fontWeight: 600 }}>{team.name}</Link>
                </td>
                <td className="utrecht-table__cell">{team.organisation.name}</td>
                <td className="utrecht-table__cell">{activeMembers}</td>
                <td className="utrecht-table__cell">{totalPositions}</td>
                <td className="utrecht-table__cell">
                  <span style={{ color: filledPositions === totalPositions && totalPositions > 0 ? "var(--rvo-color-groen-600)" : "inherit" }}>
                    {filledPositions}/{totalPositions}
                  </span>
                </td>
                <td className="utrecht-table__cell" style={{ display: "flex", gap: "1rem", whiteSpace: "nowrap" }}>
                  <Link href={`/teams/${team.id}`} className="utrecht-link">Bekijken</Link>
                  <Link href={`/teams/${team.id}/bewerken`} className="utrecht-link">Bewerken</Link>
                  <Link href={`/teams/${team.id}/overzicht`} className="utrecht-link">Overzicht</Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        buildHref={(p) => {
          const params = new URLSearchParams();
          if (q) params.set("q", q);
          if (orgId) params.set("orgId", orgId);
          if (sortCol !== "name") params.set("sort", sortCol);
          if (sortOrder !== "asc") params.set("order", sortOrder);
          params.set("page", String(p));
          return `/teams?${params}`;
        }}
      />
    </div>
  );
}
