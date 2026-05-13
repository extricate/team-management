import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Heading } from "@rijkshuisstijl-community/components-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { positions, organisations, teamPositionCouplings } from "@/lib/db/schema";
import { isNull, count, ilike, eq, asc, desc, and, ne } from "drizzle-orm";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Pagination } from "@/components/ui/Pagination";
import { SortHeader } from "@/components/ui/SortHeader";

export const metadata: Metadata = { title: "Posities – Teambeheer" };

const PAGE_SIZE = 25;
type SortCol = "type" | "organisation" | "status" | "opfType";

const STATUS_LABELS: Record<string, string> = {
  gepland: "Gepland",
  gewenst: "Gewenst",
  toegezegd: "Toegezegd",
  open: "Open",
  gevuld: "Bezet",
  gesloten: "Gesloten",
};

const STATUS_COLORS: Record<string, "green" | "orange" | "blue" | "grey"> = {
  gevuld: "green",
  open: "orange",
  toegezegd: "blue",
  gepland: "grey",
  gewenst: "grey",
  gesloten: "grey",
};

export default async function PosistiesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; sort?: string; order?: string; q?: string; orgId?: string; status?: string; archived?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const { page: pageParam, sort: sortParam, order: orderParam, q, orgId, status: statusFilter, archived } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const sortCol = (["type", "organisation", "status", "opfType"].includes(sortParam ?? "") ? sortParam : "type") as SortCol;
  const sortOrder = orderParam === "desc" ? "desc" : "asc";
  const showArchived = archived === "1";

  const allOrgs = await db
    .select({ id: organisations.id, name: organisations.name })
    .from(organisations)
    .where(isNull(organisations.deletedAt))
    .orderBy(asc(organisations.name));

  const effectiveOrgId = orgId ?? session.user.defaultOrganisationId ?? undefined;

  const conditions = [isNull(positions.deletedAt)];
  if (!showArchived) conditions.push(ne(positions.status, "gesloten"));
  if (effectiveOrgId) conditions.push(eq(positions.organisationId, effectiveOrgId));
  if (q) conditions.push(ilike(positions.type, `%${q}%`));
  if (statusFilter) conditions.push(eq(positions.status, statusFilter as never));
  const whereClause = and(...conditions);

  const [{ total }] = await db.select({ total: count() }).from(positions).where(whereClause);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(1, totalPages));
  const offset = (currentPage - 1) * PAGE_SIZE;

  const orderFn = sortOrder === "asc" ? asc : desc;
  const orderByClause =
    sortCol === "status" ? [orderFn(positions.status), asc(positions.type)] :
    sortCol === "opfType" ? [orderFn(positions.opfType), asc(positions.type)] :
    [orderFn(positions.type)];

  const rows = await db.query.positions.findMany({
    where: whereClause,
    with: {
      organisation: true,
      teamCouplings: { where: isNull(teamPositionCouplings.endDate), with: { team: true } },
    },
    orderBy: orderByClause,
    limit: PAGE_SIZE,
    offset,
  });

  const from = offset + 1;
  const to = Math.min(offset + PAGE_SIZE, total);

  function filterHref(params: Record<string, string>) {
    const p = new URLSearchParams(params);
    return `/posities?${p}`;
  }

  function buildSortHref(col: string, order: "asc" | "desc") {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (effectiveOrgId) p.set("orgId", effectiveOrgId);
    if (statusFilter) p.set("status", statusFilter);
    if (showArchived) p.set("archived", "1");
    p.set("sort", col);
    p.set("order", order);
    return `/posities?${p}`;
  }

  return (
    <div>
      <Breadcrumbs crumbs={[{ label: "Posities" }]} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <Heading level={1} style={{ margin: 0 }}>Posities</Heading>
        <Link href="/posities/nieuw" className="utrecht-button utrecht-button--primary-action">
          Nieuwe positie
        </Link>
      </div>

      {/* Filters */}
      <form method="get" action="/posities" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end", marginBottom: "1.5rem" }}>
        <div>
          <label htmlFor="q" style={{ display: "block", fontSize: "0.8125rem", marginBottom: "0.25rem", color: "var(--rvo-color-grijs-700)" }}>Zoeken</label>
          <input id="q" name="q" type="search" className="utrecht-textbox" defaultValue={q} placeholder="Functienaam…" style={{ maxWidth: "220px" }} />
        </div>
        {allOrgs.length > 1 && (
          <div>
            <label htmlFor="orgId" style={{ display: "block", fontSize: "0.8125rem", marginBottom: "0.25rem", color: "var(--rvo-color-grijs-700)" }}>Organisatie</label>
            <select id="orgId" name="orgId" className="utrecht-select" defaultValue={effectiveOrgId ?? ""}>
              <option value="">Alle organisaties</option>
              {allOrgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label htmlFor="status" style={{ display: "block", fontSize: "0.8125rem", marginBottom: "0.25rem", color: "var(--rvo-color-grijs-700)" }}>Status</label>
          <select id="status" name="status" className="utrecht-select" defaultValue={statusFilter ?? ""}>
            <option value="">Alle statussen</option>
            {Object.entries(STATUS_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <input type="checkbox" id="archived" name="archived" value="1" defaultChecked={showArchived} style={{ width: "1rem", height: "1rem" }} />
          <label htmlFor="archived" style={{ fontSize: "0.875rem" }}>Toon gesloten</label>
        </div>
        <button type="submit" className="utrecht-button utrecht-button--secondary-action">Filteren</button>
        {(q || orgId || statusFilter || showArchived) && (
          <Link href="/posities" className="utrecht-link" style={{ alignSelf: "flex-end", paddingBottom: "0.25rem", fontSize: "0.875rem" }}>× Wis filter</Link>
        )}
      </form>

      {total > 0 && (
        <p style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", color: "var(--rvo-color-grijs-600)" }}>
          {total === 1 ? "1 positie" : `${from}–${to} van ${total} posities`}
        </p>
      )}

      <div style={{ overflowX: "auto" }}>
        <table className="utrecht-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead className="utrecht-table__header">
            <tr className="utrecht-table__row">
              <SortHeader label="Functienaam" column="type" currentSort={sortCol} currentOrder={sortOrder} buildHref={buildSortHref} />
              <SortHeader label="Organisatie" column="organisation" currentSort={sortCol} currentOrder={sortOrder} buildHref={buildSortHref} />
              <th className="utrecht-table__header-cell">Team</th>
              <SortHeader label="OPF-type" column="opfType" currentSort={sortCol} currentOrder={sortOrder} buildHref={buildSortHref} />
              <SortHeader label="Status" column="status" currentSort={sortCol} currentOrder={sortOrder} buildHref={buildSortHref} />
            </tr>
          </thead>
          <tbody className="utrecht-table__body">
            {rows.length === 0 && (
              <tr className="utrecht-table__row">
                <td className="utrecht-table__cell" colSpan={5} style={{ textAlign: "center", padding: "2rem", color: "var(--rvo-color-grijs-600)" }}>
                  {q || statusFilter ? "Geen posities gevonden voor dit filter." : (
                    <>Nog geen posities aangemaakt.{" "}<Link href="/posities/nieuw" className="utrecht-link">Maak de eerste positie aan</Link></>
                  )}
                </td>
              </tr>
            )}
            {rows.map(row => {
              const activeTeam = row.teamCouplings[0]?.team ?? null;
              return (
                <tr key={row.id} className="utrecht-table__row">
                  <td className="utrecht-table__cell">
                    <Link href={`/posities/${row.id}`} className="utrecht-link" style={{ fontWeight: 600 }}>{row.type}</Link>
                    {row.positionCode && <span style={{ marginLeft: "0.375rem", color: "var(--rvo-color-grijs-500)", fontSize: "0.8125rem" }}>{row.positionCode}</span>}
                  </td>
                  <td className="utrecht-table__cell" style={{ fontSize: "0.875rem" }}>{row.organisation.name}</td>
                  <td className="utrecht-table__cell" style={{ fontSize: "0.875rem" }}>
                    {activeTeam
                      ? <Link href={`/teams/${activeTeam.id}`} className="utrecht-link">{activeTeam.name}</Link>
                      : <span style={{ color: "var(--rvo-color-grijs-500)" }}>Niet gekoppeld</span>}
                  </td>
                  <td className="utrecht-table__cell" style={{ fontSize: "0.875rem" }}>
                    {row.opfType ? <code>{row.opfType}</code> : "—"}
                  </td>
                  <td className="utrecht-table__cell">
                    <StatusBadge label={STATUS_LABELS[row.status] ?? row.status} color={STATUS_COLORS[row.status] ?? "grey"} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          buildHref={(p) => filterHref({
            ...(q ? { q } : {}),
            ...(effectiveOrgId ? { orgId: effectiveOrgId } : {}),
            ...(statusFilter ? { status: statusFilter } : {}),
            ...(showArchived ? { archived: "1" } : {}),
            ...(sortCol !== "type" ? { sort: sortCol } : {}),
            ...(sortOrder !== "asc" ? { order: sortOrder } : {}),
            page: String(p),
          })}
        />
      )}
    </div>
  );
}
