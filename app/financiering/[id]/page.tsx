import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { Alert, Heading, Paragraph } from "@rijkshuisstijl-community/components-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { financialSources } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { fetchDetailSidebar } from "@/lib/loaders/detail";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CommentSection } from "@/components/ui/CommentSection";
import { AuditLog } from "@/components/ui/AuditLog";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { ArchiveButton } from "@/components/ui/ArchiveButton";
import { ArchivedBanner } from "@/components/ui/ArchivedBanner";
import { TransferButton } from "@/components/ui/TransferButton";
import { BudgetGridEditor, type GridInitialEntry } from "@/components/ui/BudgetGridEditor";
import { formatCurrency, formatDate, prorateCost, buildEntityMetadata } from "@/lib/utils";
import { detectFinancialConflicts, type FinancialConflict as Conflict } from "@/lib/financial-conflicts";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const source = await db.query.financialSources.findFirst({ where: eq(financialSources.id, id) });
  return buildEntityMetadata(source?.name, "Financieringsbron");
}

export default async function FinancieringDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const source = await db.query.financialSources.findFirst({
    where: eq(financialSources.id, id),
    with: {
      organisation: true,
      types: { orderBy: (t, { asc }) => [asc(t.year), asc(t.type)] },
      amounts: {
        with: {
          type: true,
          allocations: {
            with: {
              position: { with: { teamCouplings: { with: { team: true } } } },
              team: true,
              bestelling: true,
              createdByUser: true,
            },
            orderBy: (al, { desc }) => [desc(al.createdAt)],
          },
        },
        orderBy: (a, { asc }) => [asc(a.createdAt)],
      },
    },
  });

  if (!source) notFound();

  const isArchived = !!source.deletedAt;

  const { comments: sourceComments, audit } = await fetchDetailSidebar("financialSource", id);

  // ── Budget summary ─────────────────────────────────────────────────────────
  const totalBudget = source.amounts.reduce((s, a) => s + Number(a.amount), 0);
  const releasedBudget = source.amounts.filter(a => a.status === "released").reduce((s, a) => s + Number(a.amount), 0);
  const allocatedBudget = source.amounts.reduce((total, a) => {
    const year = a.type?.year;
    return total + a.allocations
      .filter(al => al.status === "active")
      .reduce((s, al) => {
        const raw = Number(al.amount ?? 0);
        if (year && al.position?.expectedStart) {
          return s + prorateCost(raw, al.position.expectedStart, al.position.expectedEnd, year);
        }
        return s + raw;
      }, 0);
  }, 0);
  const remaining = releasedBudget - allocatedBudget;

  // ── Conflict detection ─────────────────────────────────────────────────────
  const conflicts: Conflict[] = detectFinancialConflicts(source.amounts);

  // ── Prepare grid data ─────────────────────────────────────────────────────
  const gridEntries: GridInitialEntry[] = source.types.map((t) => {
    const typeAmounts = source.amounts.filter(a => a.financialTypeId === t.id);
    const primary = typeAmounts[0];
    return {
      type: t.type as GridInitialEntry["type"],
      year: t.year,
      typeId: t.id,
      amountId: primary?.id ?? null,
      amount: primary ? String(Math.round(Number(primary.amount))) : "",
      status: primary?.status ?? "concept",
    };
  });
  const gridYears = Array.from(new Set(source.types.map(t => t.year))).sort((a, b) => a - b);

  return (
    <div>
      <Breadcrumbs crumbs={[{ label: "Financiering", href: "/financiering" }, { label: source.name }]} />
      {isArchived && <ArchivedBanner deletedAt={source.deletedAt!} entityLabel={source.name} />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
        <div>
          <Heading level={1} style={{ margin: "0 0 0.25rem 0" }}>{source.name}</Heading>
          <Paragraph style={{ margin: 0, color: "var(--rvo-color-grijs-600)" }}>
            Project: <code>{source.projectId}</code> · {source.organisation.name}
          </Paragraph>
        </div>
        {!isArchived && (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Link href={`/financiering/${source.id}/bewerken`} className="utrecht-button utrecht-button--secondary-action">Bewerken</Link>
            <TransferButton
              sourceId={source.id}
              sourceName={source.name}
              currentOrgId={source.organisationId}
            />
            <ArchiveButton
              entityName={source.name}
              apiPath={`/api/financial-sources/${source.id}`}
              redirectTo="/financiering"
              warningText="Alle actieve budgettoewijzingen worden gedeactiveerd."
            />
          </div>
        )}
      </div>

      {/* Conflict warnings */}
      {conflicts.length > 0 && (
        <Alert
          type={conflicts.some(c => c.severity === "error") ? "error" : "warning"}
          style={{ marginBottom: "1.5rem" }}
        >
          <Paragraph>
            <strong>
              {conflicts.some(c => c.severity === "error") ? "Financiële conflicten" : "Financiële waarschuwingen"} ({conflicts.length})
            </strong>
          </Paragraph>
          <ul style={{ margin: 0, paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            {conflicts.map((c, i) => (
              <li key={i}>{c.message}</li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Budget summary */}
      <div className="stat-tiles">
        {[
          { label: "Totaal budget", value: totalBudget, color: "var(--rvo-color-hemelblauw-700)" },
          { label: "Vrijgegeven", value: releasedBudget, color: "var(--rvo-color-groen-700)" },
          { label: "Gealloceerd", value: allocatedBudget, color: "var(--rvo-color-oranje-600, #e17000)" },
          { label: "Beschikbaar", value: remaining, color: remaining >= 0 ? "var(--rvo-color-groen-700)" : "var(--rvo-color-rood-600)" },
        ].map(({ label, value, color }) => (
          <div key={label} className="stat-tile">
            <strong className="stat-tile__value" style={{ color }}><CurrencyDisplay value={value} /></strong>
            <span className="stat-tile__label">{label}</span>
          </div>
        ))}
      </div>

      {/* Budget grid editor */}
      <section style={{ marginBottom: "2.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div>
            <Heading level={2} style={{ margin: 0 }}>Budgetplanning</Heading>
            <p className="field-label" style={{ marginTop: "0.25rem" }}>
              Bedragen in euro&apos;s per jaar · PERSEX = personele kosten, MATEX = materiële kosten
            </p>
          </div>
        </div>
        <BudgetGridEditor
          sourceId={source.id}
          initialEntries={gridEntries}
          initialYears={gridYears}
        />
      </section>

      {/* Detailed amounts per type (for auditing / advanced view) */}
      {source.types.length > 0 && (
        <details style={{ marginBottom: "2.5rem" }}>
          <summary className="utrecht-link" style={{ cursor: "pointer", fontWeight: 600, padding: "0.5rem 0", userSelect: "none" }}>
            Gedetailleerd overzicht per type & bedrag
          </summary>
          <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {!isArchived && (
              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginBottom: "0.25rem" }}>
                <Link href={`/financiering/${source.id}/types/nieuw`} className="utrecht-button utrecht-button--secondary-action" style={{ fontSize: "0.875rem" }}>Type toevoegen</Link>
                {source.types.length > 0 && (
                  <Link href={`/financiering/${source.id}/bedragen/nieuw`} className="utrecht-button utrecht-button--secondary-action" style={{ fontSize: "0.875rem" }}>Bedrag toevoegen</Link>
                )}
              </div>
            )}
            {source.types.map((t) => {
              const typeAmounts = source.amounts.filter(a => a.financialTypeId === t.id);
              const typeTotal = typeAmounts.reduce((s, a) => s + Number(a.amount), 0);
              return (
                <div key={t.id} style={{ border: "1px solid var(--rvo-color-hemelblauw-200, #b3d0ec)", borderRadius: "6px", overflow: "hidden" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1rem", background: "var(--rvo-color-hemelblauw-50, #eef4fb)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <span style={{ fontWeight: 700 }}>{t.type}</span>
                      <StatusBadge label={String(t.year)} color="blue" />
                      {typeAmounts.length > 0 && (
                        <span style={{ color: "var(--rvo-color-grijs-600)", fontSize: "0.875rem" }}><CurrencyDisplay value={typeTotal} /></span>
                      )}
                    </div>
                  </div>
                  {typeAmounts.length === 0 ? (
                    <div style={{ padding: "0.875rem 1rem", color: "var(--rvo-color-grijs-600)", fontSize: "0.875rem" }}>Nog geen bedragen voor dit type.</div>
                  ) : (
                    <table className="utrecht-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead className="utrecht-table__header">
                        <tr className="utrecht-table__row">
                          <th className="utrecht-table__header-cell">Bedrag</th>
                          <th className="utrecht-table__header-cell">Status</th>
                          <th className="utrecht-table__header-cell">Ingangsdatum</th>
                          <th className="utrecht-table__header-cell">Vrijgavedatum</th>
                          <th className="utrecht-table__header-cell">Allocaties</th>
                        </tr>
                      </thead>
                      <tbody className="utrecht-table__body">
                        {typeAmounts.map((amount) => (
                          <tr key={amount.id} className="utrecht-table__row">
                            <td className="utrecht-table__cell" style={{ whiteSpace: "nowrap" }}><strong>{formatCurrency(amount.amount)}</strong></td>
                            <td className="utrecht-table__cell"><StatusBadge label={amount.status} color={amount.status === "released" ? "green" : "grey"} /></td>
                            <td className="utrecht-table__cell" style={{ whiteSpace: "nowrap" }}>{formatDate(amount.effectiveDate)}</td>
                            <td className="utrecht-table__cell" style={{ whiteSpace: "nowrap" }}>{formatDate(amount.releaseDate)}</td>
                            <td className="utrecht-table__cell">{amount.allocations.length}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
          </div>
        </details>
      )}

      {/* Allocations */}
      <section style={{ marginBottom: "2.5rem" }}>
        <Heading level={2}>Allocaties</Heading>
        <div style={{ overflowX: "auto" }}>
          <table className="utrecht-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead className="utrecht-table__header">
              <tr className="utrecht-table__row">
                <th className="utrecht-table__header-cell">Doel</th>
                <th className="utrecht-table__header-cell">Type / jaar</th>
                <th className="utrecht-table__header-cell">Bedrag</th>
                <th className="utrecht-table__header-cell">%</th>
                <th className="utrecht-table__header-cell">Status</th>
                <th className="utrecht-table__header-cell">Van</th>
                <th className="utrecht-table__header-cell">Tot</th>
                <th className="utrecht-table__header-cell">Reden</th>
              </tr>
            </thead>
            <tbody className="utrecht-table__body">
              {source.amounts.flatMap(a => a.allocations).length === 0 && (
                <tr className="utrecht-table__row">
                  <td className="utrecht-table__cell" colSpan={8} style={{ textAlign: "center", padding: "1.5rem", color: "var(--rvo-color-grijs-600)" }}>Geen allocaties gevonden.</td>
                </tr>
              )}
              {source.amounts.flatMap(a => ({ ...a })).map(a =>
                a.allocations.map((al) => (
                  <tr key={al.id} className="utrecht-table__row">
                    <td className="utrecht-table__cell" style={{ maxWidth: "220px" }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {al.position
                          ? <><strong>{al.position.type}</strong>{al.position.teamCouplings[0]?.team ? <> in <Link href={`/teams/${al.position.teamCouplings[0].team.id}`} className="utrecht-link">{al.position.teamCouplings[0].team.name}</Link></> : null}</>
                          : al.team
                          ? <><Link href={`/teams/${al.team.id}`} className="utrecht-link">{al.team.name}</Link> (team)</>
                          : al.bestelling
                          ? <><Link href={`/bestellingen/${al.bestelling.id}`} className="utrecht-link"><code>{al.bestelling.atbNummer}</code></Link> (bestelling)</>
                          : "—"}
                      </div>
                    </td>
                    <td className="utrecht-table__cell" style={{ fontSize: "0.8125rem", color: "var(--rvo-color-grijs-600)", whiteSpace: "nowrap" }}>
                      {a.type ? `${a.type.type} ${a.type.year}` : "—"}
                    </td>
                    <td className="utrecht-table__cell" style={{ whiteSpace: "nowrap" }}><CurrencyDisplay value={al.amount} /></td>
                    <td className="utrecht-table__cell">{al.percentage ? `${al.percentage}%` : "—"}</td>
                    <td className="utrecht-table__cell">
                      <StatusBadge label={al.status} color={al.status === "active" ? "green" : al.status === "reallocated" ? "orange" : "grey"} />
                    </td>
                    <td className="utrecht-table__cell" style={{ whiteSpace: "nowrap" }}>{formatDate(al.startDate)}</td>
                    <td className="utrecht-table__cell" style={{ whiteSpace: "nowrap" }}>{al.endDate ? formatDate(al.endDate) : <span style={{ color: "var(--rvo-color-grijs-500)", fontSize: "0.8125rem" }}>Doorlopend</span>}</td>
                    <td className="utrecht-table__cell" style={{ maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={al.reason ?? undefined}>{al.reason ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Comments & Audit */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
        <CommentSection
          comments={sourceComments}
          commentableType="financialSource"
          commentableId={source.id}
          currentUserId={session.user.id!}
        />
        <AuditLog events={audit} />
      </div>
    </div>
  );
}
