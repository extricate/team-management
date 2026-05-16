import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Heading } from "@rijkshuisstijl-community/components-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { financialSources, organisations } from "@/lib/db/schema";
import { isNull, count, ilike, eq, asc, desc, and } from "drizzle-orm";
import { paginate } from "@/lib/loaders/paginate";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Pagination } from "@/components/ui/Pagination";
import { SortHeader } from "@/components/ui/SortHeader";

export const metadata: Metadata = { title: "Financieringsbronnen – Teambeheer" };

const PAGE_SIZE = 25;
type SortCol = "name" | "projectId" | "organisation";

export default async function FinancieringPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; sort?: string; order?: string; q?: string; orgId?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const { page: pageParam, sort: sortParam, order: orderParam, q, orgId } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const sortCol = (["name", "projectId", "organisation"].includes(sortParam ?? "") ? sortParam : "name") as SortCol;
  const sortOrder = orderParam === "desc" ? "desc" : "asc";

  const allOrgs = await db.select({ id: organisations.id, name: organisations.name }).from(organisations).where(isNull(organisations.deletedAt)).orderBy(asc(organisations.name));

  const effectiveOrgId = orgId ?? session.user.defaultOrganisationId ?? undefined;

  const conditions = [isNull(financialSources.deletedAt)];
  if (q) conditions.push(ilike(financialSources.name, `%${q}%`));
  if (effectiveOrgId) conditions.push(eq(financialSources.organisationId, effectiveOrgId));
  const whereClause = and(...conditions);

  const orderFn = sortOrder === "asc" ? asc : desc;
  const orderByClause = sortCol === "organisation"
    ? [orderFn(organisations.name), asc(financialSources.name)]
    : sortCol === "projectId"
    ? [orderFn(financialSources.projectId)]
    : [orderFn(financialSources.name)];

  const { rows: sources, total, totalPages, currentPage, from, to } = await paginate({
    count: async () => {
      const [{ total }] = await db.select({ total: count() }).from(financialSources).where(whereClause);
      return total;
    },
    fetch: (limit, offset) => db.query.financialSources.findMany({
      where: whereClause,
      with: {
        organisation: true,
        types: true,
        amounts: { with: { allocations: true } },
      },
      orderBy: orderByClause,
      limit,
      offset,
    }),
    page,
    pageSize: PAGE_SIZE,
  });

  function buildSortHref(col: string, order: "asc" | "desc") {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (orgId) p.set("orgId", orgId);
    p.set("sort", col);
    p.set("order", order);
    return `/financiering?${p}`;
  }

  return (
    <div>
      <Breadcrumbs crumbs={[{ label: "Financiering" }]} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <Heading level={1} style={{ margin: 0 }}>Financieringsbronnen</Heading>
        <Link href="/financiering/nieuw" className="utrecht-button utrecht-button--primary-action">Nieuwe bron</Link>
      </div>

      {/* Filters */}
      <form method="get" action="/financiering" style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <label htmlFor="q" style={{ display: "block", fontSize: "0.8125rem", marginBottom: "0.25rem", color: "var(--rvo-color-grijs-700)" }}>Zoeken</label>
          <input id="q" name="q" type="search" defaultValue={q ?? ""} placeholder="Naam financieringsbron…" className="utrecht-textbox" style={{ width: "220px" }} />
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
          <Link href="/financiering" className="utrecht-link" style={{ alignSelf: "flex-end", paddingBottom: "0.25rem", fontSize: "0.875rem" }}>× Wis filter</Link>
        )}
      </form>

      {total > 0 && (
        <p style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", color: "var(--rvo-color-grijs-600)" }}>
          {total === 1 ? "1 financieringsbron" : `${from}–${to} van ${total} financieringsbronnen`}
        </p>
      )}

      <div style={{ overflowX: "auto" }}>
        <table className="utrecht-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead className="utrecht-table__header">
            <tr className="utrecht-table__row">
              <SortHeader label="Naam" column="name" currentSort={sortCol} currentOrder={sortOrder} buildHref={buildSortHref} />
              <SortHeader label="Project ID" column="projectId" currentSort={sortCol} currentOrder={sortOrder} buildHref={buildSortHref} />
              <SortHeader label="Organisatie" column="organisation" currentSort={sortCol} currentOrder={sortOrder} buildHref={buildSortHref} />
              <th className="utrecht-table__header-cell">Totaal budget</th>
              <th className="utrecht-table__header-cell">Vrijgegeven</th>
              <th className="utrecht-table__header-cell">Gealloceerd</th>
              <th className="utrecht-table__header-cell">Acties</th>
            </tr>
          </thead>
          <tbody className="utrecht-table__body">
            {sources.length === 0 && (
              <tr className="utrecht-table__row">
                <td className="utrecht-table__cell" colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "var(--rvo-color-grijs-600)" }}>
                  {q || orgId ? "Geen financieringsbronnen gevonden voor dit filter." : "Nog geen financieringsbronnen aangemaakt."}
                </td>
              </tr>
            )}
            {sources.map((source) => {
              const totalBudget    = source.amounts.reduce((sum, a) => sum + Number(a.amount), 0);
              const releasedBudget = source.amounts.filter(a => a.status === "released").reduce((sum, a) => sum + Number(a.amount), 0);
              const allocatedBudget = source.amounts
                .flatMap(a => a.allocations)
                .filter(al => al.status === "active")
                .reduce((sum, al) => sum + Number(al.amount ?? 0), 0);

              return (
                <tr key={source.id} className="utrecht-table__row">
                  <td className="utrecht-table__cell">
                    <Link href={`/financiering/${source.id}`} className="utrecht-link" style={{ fontWeight: 600 }}>{source.name}</Link>
                  </td>
                  <td className="utrecht-table__cell"><code>{source.projectId}</code></td>
                  <td className="utrecht-table__cell">{source.organisation.name}</td>
                  <td className="utrecht-table__cell" style={{ whiteSpace: "nowrap" }}><CurrencyDisplay value={totalBudget} /></td>
                  <td className="utrecht-table__cell" style={{ whiteSpace: "nowrap" }}><CurrencyDisplay value={releasedBudget} /></td>
                  <td className="utrecht-table__cell" style={{ whiteSpace: "nowrap" }}><CurrencyDisplay value={allocatedBudget} /></td>
                  <td className="utrecht-table__cell" style={{ display: "flex", gap: "1rem", whiteSpace: "nowrap" }}>
                    <Link href={`/financiering/${source.id}`} className="utrecht-link">Bekijken</Link>
                    <Link href={`/financiering/${source.id}/bewerken`} className="utrecht-link">Bewerken</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

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
          return `/financiering?${params}`;
        }}
      />
    </div>
  );
}
