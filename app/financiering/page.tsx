import Link from "next/link";
import { redirect } from "next/navigation";
import { Heading } from "@rijkshuisstijl-community/components-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { financialSources } from "@/lib/db/schema";
import { isNull } from "drizzle-orm";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency } from "@/lib/utils";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

export default async function FinancieringPage() {
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const sources = await db.query.financialSources.findMany({
    where: isNull(financialSources.deletedAt),
    with: {
      organisation: true,
      types: true,
      amounts: { with: { allocations: true } },
    },
    orderBy: (fs, { asc }) => [asc(fs.name)],
  });

  return (
    <div>
      <Breadcrumbs crumbs={[{ label: "Financiering" }]} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <Heading level={1} style={{ margin: 0 }}>Financieringsbronnen</Heading>
        <Link href="/financiering/nieuw" className="utrecht-button utrecht-button--primary-action">+ Nieuwe bron</Link>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="utrecht-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead className="utrecht-table__header">
            <tr className="utrecht-table__row">
              <th className="utrecht-table__header-cell">Naam</th>
              <th className="utrecht-table__header-cell">Project ID</th>
              <th className="utrecht-table__header-cell">Organisatie</th>
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
                  Nog geen financieringsbronnen aangemaakt.
                </td>
              </tr>
            )}
            {sources.map((source) => {
              const totalBudget = source.amounts.reduce((sum, a) => sum + Number(a.amount), 0);
              const releasedBudget = source.amounts.filter(a => a.status === "released").reduce((sum, a) => sum + Number(a.amount), 0);
              const allocatedBudget = source.amounts.flatMap(a => a.allocations).filter(al => al.status === "active").reduce((sum, al) => sum + Number(al.amount ?? 0), 0);

              return (
                <tr key={source.id} className="utrecht-table__row">
                  <td className="utrecht-table__cell">
                    <Link href={`/financiering/${source.id}`} className="utrecht-link" style={{ fontWeight: 600 }}>{source.name}</Link>
                  </td>
                  <td className="utrecht-table__cell"><code>{source.projectId}</code></td>
                  <td className="utrecht-table__cell">{source.organisation.name}</td>
                  <td className="utrecht-table__cell">{formatCurrency(String(totalBudget))}</td>
                  <td className="utrecht-table__cell">{formatCurrency(String(releasedBudget))}</td>
                  <td className="utrecht-table__cell">{formatCurrency(String(allocatedBudget))}</td>
                  <td className="utrecht-table__cell" style={{ display: "flex", gap: "1rem" }}>
                    <Link href={`/financiering/${source.id}`} className="utrecht-link">Bekijken</Link>
                    <Link href={`/financiering/${source.id}/bewerken`} className="utrecht-link">Bewerken</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
