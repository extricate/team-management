import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Heading } from "@rijkshuisstijl-community/components-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { bestellingen, organisations } from "@/lib/db/schema";
import { isNull, count, ilike, eq, asc, desc, and } from "drizzle-orm";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Pagination } from "@/components/ui/Pagination";
import { SortHeader } from "@/components/ui/SortHeader";

export const metadata: Metadata = { title: "Bestellingen – Teambeheer" };

const PAGE_SIZE = 25;
type SortCol = "atbNummer" | "omschrijving" | "organisation" | "aanvraagDatum";

export default async function BestellingenPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; sort?: string; order?: string; q?: string; orgId?: string; typeId?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const { page: pageParam, sort: sortParam, order: orderParam, q, orgId } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const sortCol = (["atbNummer", "omschrijving", "organisation", "aanvraagDatum"].includes(sortParam ?? "") ? sortParam : "aanvraagDatum") as SortCol;
  const sortOrder = orderParam === "asc" ? "asc" : "desc";

  const allOrgs = await db.select({ id: organisations.id, name: organisations.name }).from(organisations).where(isNull(organisations.deletedAt)).orderBy(asc(organisations.name));

  const conditions = [isNull(bestellingen.deletedAt)];
  if (q) conditions.push(ilike(bestellingen.atbNummer, `%${q}%`));
  if (orgId) conditions.push(eq(bestellingen.organisationId, orgId));
  const whereClause = and(...conditions);

  const [{ total }] = await db.select({ total: count() }).from(bestellingen).where(whereClause);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(1, totalPages));
  const offset = (currentPage - 1) * PAGE_SIZE;

  const orderFn = sortOrder === "asc" ? asc : desc;
  const orderByClause =
    sortCol === "organisation" ? [orderFn(organisations.name), desc(bestellingen.aanvraagDatum)] :
    sortCol === "atbNummer"   ? [orderFn(bestellingen.atbNummer)] :
    sortCol === "omschrijving" ? [orderFn(bestellingen.omschrijving)] :
    [orderFn(bestellingen.aanvraagDatum)];

  const rows = await db.query.bestellingen.findMany({
    where: whereClause,
    with: {
      type: true,
      organisation: true,
      fundingAllocations: true,
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
    return `/bestellingen?${p}`;
  }

  return (
    <div>
      <Breadcrumbs crumbs={[{ label: "Bestellingen" }]} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <Heading level={1} style={{ margin: 0 }}>Bestellingen</Heading>
        <Link href="/bestellingen/nieuw" className="utrecht-button utrecht-button--primary-action">+ Nieuwe bestelling</Link>
      </div>

      <form method="get" action="/bestellingen" style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <label htmlFor="q" style={{ display: "block", fontSize: "0.8125rem", marginBottom: "0.25rem", color: "var(--rvo-color-grijs-700)" }}>ATB-nummer</label>
          <input id="q" name="q" type="search" defaultValue={q ?? ""} placeholder="bijv. ATB-2025-001" className="utrecht-textbox" style={{ width: "200px" }} />
        </div>
        <div>
          <label htmlFor="orgId" style={{ display: "block", fontSize: "0.8125rem", marginBottom: "0.25rem", color: "var(--rvo-color-grijs-700)" }}>Organisatie</label>
          <select id="orgId" name="orgId" className="utrecht-select" defaultValue={orgId ?? ""}>
            <option value="">Alle organisaties</option>
            {allOrgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
        <button type="submit" className="utrecht-button utrecht-button--secondary-action">Filteren</button>
        {(q || orgId) && (
          <Link href="/bestellingen" className="utrecht-link" style={{ alignSelf: "flex-end", paddingBottom: "0.25rem", fontSize: "0.875rem" }}>× Wis filter</Link>
        )}
      </form>

      {total > 0 && (
        <p style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", color: "var(--rvo-color-grijs-600)" }}>
          {total === 1 ? "1 bestelling" : `${from}–${to} van ${total} bestellingen`}
        </p>
      )}

      <div style={{ overflowX: "auto" }}>
        <table className="utrecht-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead className="utrecht-table__header">
            <tr className="utrecht-table__row">
              <SortHeader label="ATB-nummer" column="atbNummer" currentSort={sortCol} currentOrder={sortOrder} buildHref={buildSortHref} />
              <SortHeader label="Omschrijving" column="omschrijving" currentSort={sortCol} currentOrder={sortOrder} buildHref={buildSortHref} />
              <th className="utrecht-table__header-cell">Type</th>
              <SortHeader label="Organisatie" column="organisation" currentSort={sortCol} currentOrder={sortOrder} buildHref={buildSortHref} />
              <th className="utrecht-table__header-cell">Geraamd</th>
              <th className="utrecht-table__header-cell">Werkelijk</th>
              <SortHeader label="Aanvraagdatum" column="aanvraagDatum" currentSort={sortCol} currentOrder={sortOrder} buildHref={buildSortHref} />
              <th className="utrecht-table__header-cell">Acties</th>
            </tr>
          </thead>
          <tbody className="utrecht-table__body">
            {rows.length === 0 && (
              <tr className="utrecht-table__row">
                <td className="utrecht-table__cell" colSpan={8} style={{ textAlign: "center", padding: "2rem", color: "var(--rvo-color-grijs-600)" }}>
                  {q || orgId ? "Geen bestellingen gevonden voor dit filter." : "Nog geen bestellingen aangemaakt."}
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="utrecht-table__row">
                <td className="utrecht-table__cell">
                  <Link href={`/bestellingen/${row.id}`} className="utrecht-link" style={{ fontWeight: 600 }}>
                    <code>{row.atbNummer}</code>
                  </Link>
                </td>
                <td className="utrecht-table__cell">{row.omschrijving}</td>
                <td className="utrecht-table__cell">{row.type.naam}</td>
                <td className="utrecht-table__cell">{row.organisation.name}</td>
                <td className="utrecht-table__cell" style={{ whiteSpace: "nowrap" }}>
                  {row.geraamdBedrag ? <CurrencyDisplay value={Number(row.geraamdBedrag)} /> : <span style={{ color: "var(--rvo-color-grijs-500)" }}>—</span>}
                </td>
                <td className="utrecht-table__cell" style={{ whiteSpace: "nowrap" }}>
                  {row.werkelijkBedrag ? <CurrencyDisplay value={Number(row.werkelijkBedrag)} /> : <span style={{ color: "var(--rvo-color-grijs-500)" }}>—</span>}
                </td>
                <td className="utrecht-table__cell" style={{ whiteSpace: "nowrap" }}>
                  {row.aanvraagDatum ? row.aanvraagDatum.toLocaleDateString("nl-NL") : <span style={{ color: "var(--rvo-color-grijs-500)" }}>—</span>}
                </td>
                <td className="utrecht-table__cell" style={{ display: "flex", gap: "1rem", whiteSpace: "nowrap" }}>
                  <Link href={`/bestellingen/${row.id}`} className="utrecht-link">Bekijken</Link>
                  <Link href={`/bestellingen/${row.id}/bewerken`} className="utrecht-link">Bewerken</Link>
                </td>
              </tr>
            ))}
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
          if (sortCol !== "aanvraagDatum") params.set("sort", sortCol);
          if (sortOrder !== "desc") params.set("order", sortOrder);
          params.set("page", String(p));
          return `/bestellingen?${params}`;
        }}
      />
    </div>
  );
}
