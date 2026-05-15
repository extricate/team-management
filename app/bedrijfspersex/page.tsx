import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Heading, Alert, Paragraph } from "@rijkshuisstijl-community/components-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { fundingAllocations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { summarizeCompanyPersex } from "@/lib/company-persex";
import { BedrijfspersexBudgetEditor } from "./BedrijfspersexBudgetEditor";

export const metadata: Metadata = { title: "Bedrijfspersex – Teambeheer" };

export default async function BedrijfspersexPage() {
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const budgets = await db.query.companyPersexBudgets.findMany({
    with: {
      allocations: {
        where: eq(fundingAllocations.status, "active"),
        with: { position: { with: { teamCouplings: { with: { team: true } } } }, team: true },
      },
    },
    orderBy: (b, { asc }) => [asc(b.year)],
  });

  const summary = summarizeCompanyPersex(budgets);

  return (
    <div>
      <Breadcrumbs crumbs={[{ label: "Bedrijfspersex" }]} />
      <div style={{ marginBottom: "2rem" }}>
        <Heading level={1} style={{ margin: "0 0 0.375rem 0" }}>Bedrijfspersex</Heading>
        <Paragraph style={{ margin: 0, color: "var(--rvo-color-grijs-600)" }}>
          Afdelingsbrede personeelspot — voor posities die niet aan een specifieke financieringsbron gekoppeld kunnen worden.
          Het maximum is een zacht plafond; overschrijding is enkel toegestaan i.o.m. controller & directie.
        </Paragraph>
      </div>

      {/* Summary cards */}
      <div className="stat-tiles">
        {[
          { label: "Totaal budget", value: summary.totalBudget, color: "var(--rvo-color-hemelblauw-700)" },
          { label: "Gealloceerd", value: summary.totalAllocated, color: "var(--rvo-color-oranje-600, #e17000)" },
          { label: "Resterend", value: summary.totalBudget - summary.totalAllocated, color: summary.totalAllocated <= summary.totalBudget ? "var(--rvo-color-groen-700)" : "var(--rvo-color-grijs-600)" },
        ].map(({ label, value, color }) => (
          <div key={label} className="stat-tile">
            <strong className="stat-tile__value" style={{ color }}><CurrencyDisplay value={value} /></strong>
            <span className="stat-tile__label">{label}</span>
          </div>
        ))}
        {summary.totalBudget > 0 && (
          <div className="stat-tile">
            <strong className="stat-tile__value" style={{
              color: summary.utilizationPercent > 100
                ? "var(--rvo-color-rood-600)"
                : summary.utilizationPercent > 80
                ? "var(--rvo-color-oranje-600, #e17000)"
                : "var(--rvo-color-groen-700)",
            }}>
              {summary.utilizationPercent}%
            </strong>
            <span className="stat-tile__label">Benutting</span>
          </div>
        )}
      </div>

      {/* Conflict warnings */}
      {summary.conflicts.length > 0 && (
        <Alert type="warning" style={{ marginBottom: "1.5rem" }}>
          <Paragraph>
            <strong>Waarschuwing</strong>
          </Paragraph>
          <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
            {summary.conflicts.map((c, i) => <li key={i}>{c.message}</li>)}
          </ul>
        </Alert>
      )}

      {/* Budget editor per year */}
      <section style={{ marginBottom: "2.5rem" }}>
        <Heading level={2} style={{ marginBottom: "1rem" }}>Budget per jaar</Heading>
        <BedrijfspersexBudgetEditor budgets={budgets.map(b => ({
          id: b.id,
          year: b.year,
          amount: String(b.amount),
          status: b.status,
        }))} />
      </section>

      {/* Allocations across all years */}
      {budgets.some(b => b.allocations.length > 0) && (
        <section>
          <Heading level={2} style={{ marginBottom: "1rem" }}>Gekoppelde posities & teams</Heading>
          <div style={{ overflowX: "auto" }}>
            <table className="utrecht-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead className="utrecht-table__header">
                <tr className="utrecht-table__row">
                  <th className="utrecht-table__header-cell">Jaar</th>
                  <th className="utrecht-table__header-cell">Doel</th>
                  <th className="utrecht-table__header-cell">Bedrag</th>
                  <th className="utrecht-table__header-cell">Status</th>
                </tr>
              </thead>
              <tbody className="utrecht-table__body">
                {budgets.flatMap(b =>
                  b.allocations.map(al => (
                    <tr key={al.id} className="utrecht-table__row">
                      <td className="utrecht-table__cell">{b.year}</td>
                      <td className="utrecht-table__cell">
                        {al.position
                          ? <><strong>{al.position.type}</strong>{al.position.teamCouplings[0]?.team ? ` · ${al.position.teamCouplings[0].team.name}` : ""}</>
                          : al.team
                          ? al.team.name
                          : "—"}
                      </td>
                      <td className="utrecht-table__cell" style={{ whiteSpace: "nowrap" }}>
                        <CurrencyDisplay value={al.amount} />
                      </td>
                      <td className="utrecht-table__cell">
                        <StatusBadge label={al.status} color={al.status === "active" ? "green" : "grey"} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
