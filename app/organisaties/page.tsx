import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Heading } from "@rijkshuisstijl-community/components-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { organisations } from "@/lib/db/schema";
import { isNull, ilike, eq, asc, desc, and } from "drizzle-orm";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { SortHeader } from "@/components/ui/SortHeader";

export const metadata: Metadata = { title: "Organisaties – Teambeheer" };

type SortCol = "name" | "type";

export default async function OrganisatiesPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; order?: string; q?: string; type?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const { sort: sortParam, order: orderParam, q, type: typeFilter } = await searchParams;
  const sortCol = (["name", "type"].includes(sortParam ?? "") ? sortParam : "name") as SortCol;
  const sortOrder = orderParam === "desc" ? "desc" : "asc";

  const conditions = [isNull(organisations.deletedAt)];
  if (q) conditions.push(ilike(organisations.name, `%${q}%`));
  if (typeFilter === "OS1" || typeFilter === "OS2") conditions.push(eq(organisations.type, typeFilter));
  const whereClause = and(...conditions);

  const orderFn = sortOrder === "asc" ? asc : desc;
  const orderByClause = sortCol === "type"
    ? [orderFn(organisations.type), asc(organisations.name)]
    : [orderFn(organisations.name)];

  const orgs = await db.query.organisations.findMany({
    where: whereClause,
    with: { teams: true, employees: true },
    orderBy: orderByClause,
  });

  function buildSortHref(col: string, order: "asc" | "desc") {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (typeFilter) p.set("type", typeFilter);
    p.set("sort", col);
    p.set("order", order);
    return `/organisaties?${p}`;
  }

  return (
    <div>
      <Breadcrumbs crumbs={[{ label: "Organisaties" }]} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <Heading level={1} style={{ margin: 0 }}>Organisaties</Heading>
        <Link href="/organisaties/nieuw" className="utrecht-button utrecht-button--primary-action">+ Nieuwe organisatie</Link>
      </div>

      {/* Filters */}
      <form method="get" action="/organisaties" style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <label htmlFor="q" style={{ display: "block", fontSize: "0.8125rem", marginBottom: "0.25rem", color: "var(--rvo-color-grijs-700)" }}>Zoeken</label>
          <input id="q" name="q" type="search" defaultValue={q ?? ""} placeholder="Naam…" className="utrecht-textbox" style={{ width: "200px" }} />
        </div>
        <div>
          <label htmlFor="type" style={{ display: "block", fontSize: "0.8125rem", marginBottom: "0.25rem", color: "var(--rvo-color-grijs-700)" }}>Type</label>
          <select id="type" name="type" className="utrecht-select" defaultValue={typeFilter ?? ""}>
            <option value="">Alle types</option>
            <option value="OS1">OS1</option>
            <option value="OS2">OS2</option>
          </select>
        </div>
        <button type="submit" className="utrecht-button utrecht-button--secondary-action">Filteren</button>
        {(q || typeFilter) && (
          <Link href="/organisaties" className="utrecht-link" style={{ alignSelf: "flex-end", paddingBottom: "0.25rem", fontSize: "0.875rem" }}>× Wis filter</Link>
        )}
      </form>

      <table className="utrecht-table">
        <thead className="utrecht-table__header">
          <tr className="utrecht-table__row">
            <SortHeader label="Naam" column="name" currentSort={sortCol} currentOrder={sortOrder} buildHref={buildSortHref} />
            <SortHeader label="Type" column="type" currentSort={sortCol} currentOrder={sortOrder} buildHref={buildSortHref} />
            <th className="utrecht-table__header-cell">Teams</th>
            <th className="utrecht-table__header-cell">Medewerkers</th>
            <th className="utrecht-table__header-cell">Acties</th>
          </tr>
        </thead>
        <tbody className="utrecht-table__body">
          {orgs.length === 0 && (
            <tr className="utrecht-table__row">
              <td className="utrecht-table__cell" colSpan={5} style={{ textAlign: "center", padding: "2rem", color: "var(--rvo-color-grijs-600)" }}>
                {q || typeFilter ? "Geen organisaties gevonden voor dit filter." : "Nog geen organisaties aangemaakt."}
              </td>
            </tr>
          )}
          {orgs.map((org) => (
            <tr key={org.id} className="utrecht-table__row">
              <td className="utrecht-table__cell">
                <Link href={`/organisaties/${org.id}`} className="utrecht-link" style={{ fontWeight: 600 }}>{org.name}</Link>
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
