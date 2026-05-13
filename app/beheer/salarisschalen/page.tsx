import { redirect } from "next/navigation";
import Link from "next/link";
import { Heading } from "@rijkshuisstijl-community/components-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { salarisschalen } from "@/lib/db/schema";
import { asc, desc } from "drizzle-orm";
import { formatCurrency } from "@/lib/utils";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { SortHeader } from "@/components/ui/SortHeader";

export const metadata = { title: "Salarisschalen – Teambeheer" };

type SortCol = "schaal" | "year" | "primaryCost" | "secondaryEffects" | "tertiaryEffects";

export default async function SalarisschalenPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; order?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/inloggen?callbackUrl=/beheer/salarisschalen");
  if (session.user.role !== "admin") redirect("/dashboard");

  const { sort: sortParam, order: orderParam } = await searchParams;
  const sortCol = (["schaal", "year", "primaryCost", "secondaryEffects", "tertiaryEffects"].includes(sortParam ?? "") ? sortParam : "schaal") as SortCol;
  const sortOrder = orderParam === "desc" ? "desc" : "asc";

  const orderFn = sortOrder === "asc" ? asc : desc;
  const colMap = {
    schaal: salarisschalen.schaalCode,
    year: salarisschalen.year,
    primaryCost: salarisschalen.primaryCost,
    secondaryEffects: salarisschalen.secondaryEffects,
    tertiaryEffects: salarisschalen.tertiaryEffects,
  };
  const secondaryOrder = sortCol === "schaal" ? asc(salarisschalen.year) : asc(salarisschalen.schaalCode);

  const schalen = await db
    .select()
    .from(salarisschalen)
    .orderBy(orderFn(colMap[sortCol]), secondaryOrder);

  function buildSortHref(col: string, order: "asc" | "desc") {
    const p = new URLSearchParams();
    p.set("sort", col);
    p.set("order", order);
    return `/beheer/salarisschalen?${p}`;
  }

  return (
    <div>
      <Breadcrumbs crumbs={[
        { label: "Instellingen", href: "/instellingen" },
        { label: "Salarisschalen" },
      ]} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <Heading level={1} style={{ margin: 0 }}>Salarisschalen</Heading>
        <Link href="/beheer/salarisschalen/nieuw" className="utrecht-button utrecht-button--primary-action">
          Nieuwe schaal
        </Link>
      </div>

      <table className="utrecht-table">
        <thead className="utrecht-table__header">
          <tr className="utrecht-table__row">
            <SortHeader label="Schaal" column="schaal" currentSort={sortCol} currentOrder={sortOrder} buildHref={buildSortHref} />
            <SortHeader label="Jaar" column="year" currentSort={sortCol} currentOrder={sortOrder} buildHref={buildSortHref} />
            <SortHeader label="Primaire kosten" column="primaryCost" currentSort={sortCol} currentOrder={sortOrder} buildHref={buildSortHref} />
            <SortHeader label="2e-orde" column="secondaryEffects" currentSort={sortCol} currentOrder={sortOrder} buildHref={buildSortHref} />
            <SortHeader label="3e-orde" column="tertiaryEffects" currentSort={sortCol} currentOrder={sortOrder} buildHref={buildSortHref} />
            <th className="utrecht-table__header-cell">Totaal</th>
            <th className="utrecht-table__header-cell">Acties</th>
          </tr>
        </thead>
        <tbody className="utrecht-table__body">
          {schalen.length === 0 && (
            <tr className="utrecht-table__row">
              <td className="utrecht-table__cell" colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "var(--rvo-color-grijs-600)" }}>
                Nog geen salarisschalen geconfigureerd. Voeg een schaal toe om standaardkosten in te stellen.
              </td>
            </tr>
          )}
          {schalen.map((s) => {
            const total = parseFloat(s.primaryCost) + parseFloat(s.secondaryEffects) + parseFloat(s.tertiaryEffects);
            return (
              <tr key={s.id} className="utrecht-table__row">
                <td className="utrecht-table__cell" style={{ fontWeight: 600 }}>{s.schaalCode}</td>
                <td className="utrecht-table__cell">{s.year}</td>
                <td className="utrecht-table__cell">{formatCurrency(parseFloat(s.primaryCost))}</td>
                <td className="utrecht-table__cell">{formatCurrency(parseFloat(s.secondaryEffects))}</td>
                <td className="utrecht-table__cell">{formatCurrency(parseFloat(s.tertiaryEffects))}</td>
                <td className="utrecht-table__cell" style={{ fontWeight: 600 }}>{formatCurrency(total)}</td>
                <td className="utrecht-table__cell">
                  <Link href={`/beheer/salarisschalen/${s.id}/bewerken`} className="utrecht-link">
                    Bewerken
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
