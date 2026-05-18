import { redirect } from "next/navigation";
import Link from "next/link";
import { Heading } from "@rijkshuisstijl-community/components-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { functies } from "@/lib/db/schema";
import { asc, isNull } from "drizzle-orm";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { SortHeader } from "@/components/ui/SortHeader";
import { NIET_BESCHIKBAAR_TITEL } from "@/lib/functies";

export const metadata = { title: "Functies – Teambeheer" };

type SortCol = "titel" | "schaal" | "actief";

export default async function FunctiesPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; order?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/inloggen?callbackUrl=/beheer/functies");
  if (session.user.role !== "admin") redirect("/dashboard");

  const { sort: sortParam, order: orderParam } = await searchParams;
  const sortCol = (["titel", "schaal", "actief"].includes(sortParam ?? "") ? sortParam : "titel") as SortCol;
  const sortOrder = orderParam === "desc" ? "desc" : "asc";

  const allFuncties = await db
    .select()
    .from(functies)
    .where(isNull(functies.deletedAt))
    .orderBy(asc(functies.titel));

  const sorted = [...allFuncties].sort((a, b) => {
    let cmp = 0;
    if (sortCol === "titel") cmp = a.titel.localeCompare(b.titel, "nl");
    else if (sortCol === "schaal") cmp = (a.schaalCode ?? "").localeCompare(b.schaalCode ?? "", "nl");
    else if (sortCol === "actief") cmp = Number(b.isActive) - Number(a.isActive);
    return sortOrder === "desc" ? -cmp : cmp;
  });

  function buildSortHref(col: string, order: "asc" | "desc") {
    const p = new URLSearchParams();
    p.set("sort", col);
    p.set("order", order);
    return `/beheer/functies?${p}`;
  }

  return (
    <div>
      <Breadcrumbs crumbs={[
        { label: "Beheer", href: "/beheer/salarisschalen" },
        { label: "Functies" },
      ]} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <Heading level={1} style={{ margin: 0 }}>Functies</Heading>
        <Link href="/beheer/functies/nieuw" className="utrecht-button utrecht-button--primary-action">
          Nieuwe functie
        </Link>
      </div>

      <table className="utrecht-table">
        <thead className="utrecht-table__header">
          <tr className="utrecht-table__row">
            <SortHeader label="Titel" column="titel" currentSort={sortCol} currentOrder={sortOrder} buildHref={buildSortHref} />
            <SortHeader label="Schaal" column="schaal" currentSort={sortCol} currentOrder={sortOrder} buildHref={buildSortHref} />
            <th className="utrecht-table__header-cell">Actief</th>
            <th className="utrecht-table__header-cell">Acties</th>
          </tr>
        </thead>
        <tbody className="utrecht-table__body">
          {sorted.length === 0 && (
            <tr className="utrecht-table__row">
              <td className="utrecht-table__cell" colSpan={4} style={{ textAlign: "center", padding: "2rem", color: "var(--rvo-color-grijs-600)" }}>
                Nog geen functies geconfigureerd.
              </td>
            </tr>
          )}
          {sorted.map((f) => (
            <tr key={f.id} className="utrecht-table__row">
              <td className="utrecht-table__cell" style={{ fontWeight: 600 }}>
                <Link href={`/beheer/functies/${f.id}`} className="utrecht-link">{f.titel}</Link>
              </td>
              <td className="utrecht-table__cell">{f.schaalCode ?? "—"}</td>
              <td className="utrecht-table__cell">
                <span style={{ color: f.isActive ? "var(--rvo-color-groen-600)" : "var(--rvo-color-grijs-600)" }}>
                  {f.isActive ? "Actief" : "Inactief"}
                </span>
              </td>
              <td className="utrecht-table__cell">
                {f.titel !== NIET_BESCHIKBAAR_TITEL && (
                  <Link href={`/beheer/functies/${f.id}/bewerken`} className="utrecht-link">
                    Bewerken
                  </Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
