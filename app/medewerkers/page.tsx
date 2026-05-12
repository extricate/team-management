import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Heading } from "@rijkshuisstijl-community/components-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { employees, organisations } from "@/lib/db/schema";
import { isNull, count, ilike, eq, asc, desc, and, or } from "drizzle-orm";
import { formatFullName } from "@/lib/utils";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Pagination } from "@/components/ui/Pagination";
import { SortHeader } from "@/components/ui/SortHeader";

export const metadata: Metadata = { title: "Medewerkers – Teambeheer" };

const PAGE_SIZE = 50;
type SortCol = "name" | "organisation";

export default async function MedewerkersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; sort?: string; order?: string; q?: string; orgId?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const { page: pageParam, sort: sortParam, order: orderParam, q, orgId } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const sortCol = (["name", "organisation"].includes(sortParam ?? "") ? sortParam : "name") as SortCol;
  const sortOrder = orderParam === "desc" ? "desc" : "asc";

  const allOrgs = await db.select({ id: organisations.id, name: organisations.name }).from(organisations).where(isNull(organisations.deletedAt)).orderBy(asc(organisations.name));

  const effectiveOrgId = orgId ?? session.user.defaultOrganisationId ?? undefined;

  const conditions = [isNull(employees.deletedAt)];
  if (effectiveOrgId) conditions.push(eq(employees.organisationId, effectiveOrgId));
  if (q) {
    conditions.push(
      or(
        ilike(employees.firstName, `%${q}%`),
        ilike(employees.lastName, `%${q}%`),
        ilike(employees.prefixName, `%${q}%`),
        ilike(employees.personeelsnummer, `%${q}%`),
      )!,
    );
  }
  const whereClause = and(...conditions);

  const [{ total }] = await db.select({ total: count() }).from(employees).where(whereClause);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(1, totalPages));
  const offset = (currentPage - 1) * PAGE_SIZE;

  const orderFn = sortOrder === "asc" ? asc : desc;
  const orderByClause = sortCol === "organisation"
    ? [orderFn(organisations.name), asc(employees.lastName), asc(employees.firstName)]
    : [orderFn(employees.lastName), orderFn(employees.firstName)];

  const pageEmployees = await db.query.employees.findMany({
    where: whereClause,
    with: {
      organisation: true,
      memberships: { with: { team: true } },
      positionAssignments: { with: { position: true } },
    },
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
    return `/medewerkers?${p}`;
  }

  return (
    <div>
      <Breadcrumbs crumbs={[{ label: "Medewerkers" }]} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <Heading level={1} style={{ margin: 0 }}>Medewerkers</Heading>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Link href="/medewerkers/bulk-import" className="utrecht-button utrecht-button--secondary-action">Bulk importeren</Link>
          <Link href="/medewerkers/nieuw" className="utrecht-button utrecht-button--primary-action">Nieuwe medewerker</Link>
        </div>
      </div>

      {/* Filters */}
      <form method="get" action="/medewerkers" style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <label htmlFor="q" style={{ display: "block", fontSize: "0.8125rem", marginBottom: "0.25rem", color: "var(--rvo-color-grijs-700)" }}>Zoeken</label>
          <input id="q" name="q" type="search" defaultValue={q ?? ""} placeholder="Naam…" className="utrecht-textbox" style={{ width: "200px" }} />
        </div>
        <div>
          <label htmlFor="orgId" style={{ display: "block", fontSize: "0.8125rem", marginBottom: "0.25rem", color: "var(--rvo-color-grijs-700)" }}>Organisatie</label>
          <select id="orgId" name="orgId" className="utrecht-select" defaultValue={effectiveOrgId ?? ""}>
            <option value="">Alle organisaties</option>
            {allOrgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
        <button type="submit" className="utrecht-button utrecht-button--secondary-action">Filteren</button>
        {(q || orgId) && (
          <Link href="/medewerkers" className="utrecht-link" style={{ alignSelf: "flex-end", paddingBottom: "0.25rem", fontSize: "0.875rem" }}>× Wis filter</Link>
        )}
      </form>

      {total > 0 && (
        <p style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", color: "var(--rvo-color-grijs-600)" }}>
          {total === 1 ? "1 medewerker" : `${from}–${to} van ${total} medewerkers`}
        </p>
      )}

      <table className="utrecht-table">
        <thead className="utrecht-table__header">
          <tr className="utrecht-table__row">
            <SortHeader label="Naam" column="name" currentSort={sortCol} currentOrder={sortOrder} buildHref={buildSortHref} />
            <SortHeader label="Organisatie" column="organisation" currentSort={sortCol} currentOrder={sortOrder} buildHref={buildSortHref} />
            <th className="utrecht-table__header-cell">Teams</th>
            <th className="utrecht-table__header-cell">Huidige positie</th>
            <th className="utrecht-table__header-cell">Acties</th>
          </tr>
        </thead>
        <tbody className="utrecht-table__body">
          {pageEmployees.length === 0 && (
            <tr className="utrecht-table__row">
              <td className="utrecht-table__cell" colSpan={5} style={{ textAlign: "center", padding: "2rem", color: "var(--rvo-color-grijs-600)" }}>
                {q || orgId ? "Geen medewerkers gevonden voor dit filter." : "Nog geen medewerkers aangemaakt."}
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
                <td className="utrecht-table__cell" style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={activeTeams.length > 0 ? activeTeams.map(m => m.team.name).join(", ") : undefined}>
                  {activeTeams.length === 0
                    ? <span style={{ color: "var(--rvo-color-grijs-500)" }}>Geen</span>
                    : activeTeams.map(m => m.team.name).join(", ")}
                </td>
                <td className="utrecht-table__cell" style={{ maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={activePos?.position.type ?? undefined}>
                  {activePos ? activePos.position.type : <span style={{ color: "var(--rvo-color-grijs-500)" }}>Geen</span>}
                </td>
                <td className="utrecht-table__cell" style={{ display: "flex", gap: "1rem", whiteSpace: "nowrap" }}>
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
        buildHref={(p) => {
          const params = new URLSearchParams();
          if (q) params.set("q", q);
          if (orgId) params.set("orgId", orgId);
          if (sortCol !== "name") params.set("sort", sortCol);
          if (sortOrder !== "asc") params.set("order", sortOrder);
          params.set("page", String(p));
          return `/medewerkers?${params}`;
        }}
      />
    </div>
  );
}
