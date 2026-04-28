import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { Heading, Paragraph } from "@rijkshuisstijl-community/components-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { financialSources, comments, auditEvents } from "@/lib/db/schema";
import { eq, isNull, desc, and } from "drizzle-orm";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CommentSection } from "@/components/ui/CommentSection";
import { AuditLog } from "@/components/ui/AuditLog";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { BudgetGridEditor, type GridInitialEntry } from "@/components/ui/BudgetGridEditor";
import { formatCurrency, formatDate } from "@/lib/utils";

type ConflictSeverity = "error" | "warning";
interface Conflict { severity: ConflictSeverity; message: string }

export default async function FinancieringDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const source = await db.query.financialSources.findFirst({
    where: and(eq(financialSources.id, params.id), isNull(financialSources.deletedAt)),
    with: {
      organisation: true,
      types: { orderBy: (t, { asc }) => [asc(t.year), asc(t.type)] },
      amounts: {
        with: {
          financialType: true,
          allocations: {
            with: {
              position: { with: { team: true } },
              team: true,
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

  const sourceComments = await db.query.comments.findMany({
    where: and(eq(comments.commentableType, "financialSource"), eq(comments.commentableId, params.id)),
    with: { createdByUser: true },
    orderBy: [desc(comments.createdAt)],
  });

  const audit = await db.query.auditEvents.findMany({
    where: and(eq(auditEvents.entityType, "financialSource"), eq(auditEvents.entityId, params.id)),
    with: { actorUser: true },
    orderBy: [desc(auditEvents.createdAt)],
    limit: 50,
  });

  // ── Budget summary ─────────────────────────────────────────────────────────
  const totalBudget = source.amounts.reduce((s, a) => s + Number(a.amount), 0);
  const releasedBudget = source.amounts.filter(a => a.status === "released").reduce((s, a) => s + Number(a.amount), 0);
  const allocatedBudget = source.amounts.flatMap(a => a.allocations).filter(al => al.status === "active").reduce((s, al) => s + Number(al.amount ?? 0), 0);
  const remaining = releasedBudget - allocatedBudget;

  // ── Conflict detection ─────────────────────────────────────────────────────
  const conflicts: Conflict[] = [];
  for (const amount of source.amounts) {
    const activeAllocs = amount.allocations.filter(al => al.status === "active");
    const totalAllocated = activeAllocs.reduce((s, al) => s + Number(al.amount ?? 0), 0);
    const amountVal = Number(amount.amount);
    const label = amount.financialType
      ? `${amount.financialType.type} ${amount.financialType.year}`
      : "Ongetypeerd bedrag";

    if (activeAllocs.length > 0 && totalAllocated > amountVal) {
      const over = totalAllocated - amountVal;
      conflicts.push({
        severity: "error",
        message: `${label}: gealloceerd (${formatCurrency(totalAllocated)}) overschrijdt het bedrag (${formatCurrency(amountVal)}) met ${formatCurrency(over)}.`,
      });
    }
    if (amount.status === "concept" && activeAllocs.length > 0) {
      conflicts.push({
        severity: "warning",
        message: `${label}: ${activeAllocs.length} actieve allocatie(s) zijn gekoppeld aan een conceptbedrag (nog niet vrijgegeven).`,
      });
    }
    if (amount.releaseDate) {
      for (const al of activeAllocs) {
        if (al.startDate && al.startDate < amount.releaseDate) {
          conflicts.push({
            severity: "warning",
            message: `${label}: allocatie start op ${formatDate(al.startDate)}, vóór de vrijgavedatum van ${formatDate(amount.releaseDate)}.`,
          });
          break;
        }
      }
    }
  }

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
        <div>
          <Heading level={1} style={{ margin: "0 0 0.25rem 0" }}>{source.name}</Heading>
          <Paragraph style={{ margin: 0, color: "var(--rvo-color-grijs-600)" }}>
            Project: <code>{source.projectId}</code> · {source.organisation.name}
          </Paragraph>
        </div>
        <Link href={`/financiering/${source.id}/bewerken`} className="utrecht-button utrecht-button--secondary-action">Bewerken</Link>
      </div>

      {/* Conflict warnings */}
      {conflicts.length > 0 && (
        <section style={{ marginBottom: "1.5rem" }}>
          <div style={{ padding: "0.875rem 1rem", borderRadius: "6px", border: `1px solid ${conflicts.some(c => c.severity === "error") ? "var(--rvo-color-rood-300, #f5a3a3)" : "var(--rvo-color-geel-400, #e6a817)"}`, background: conflicts.some(c => c.severity === "error") ? "var(--rvo-color-rood-50, #fff5f5)" : "var(--rvo-color-geel-50, #fffbea)" }}>
            <strong style={{ display: "block", marginBottom: "0.5rem", color: conflicts.some(c => c.severity === "error") ? "var(--rvo-color-rood-700, #b30000)" : "var(--rvo-color-oranje-800, #7a3b00)" }}>
              {conflicts.some(c => c.severity === "error") ? "⚠ Financiële conflicten" : "⚠ Financiële waarschuwingen"} ({conflicts.length})
            </strong>
            <ul style={{ margin: 0, paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              {conflicts.map((c, i) => (
                <li key={i} style={{ fontSize: "0.875rem", color: c.severity === "error" ? "var(--rvo-color-rood-700, #b30000)" : "var(--rvo-color-oranje-800, #7a3b00)" }}>
                  {c.message}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Budget summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        {[
          { label: "Totaal budget", value: totalBudget, color: "var(--rvo-color-hemelblauw-700)" },
          { label: "Vrijgegeven", value: releasedBudget, color: "var(--rvo-color-groen-700)" },
          { label: "Gealloceerd", value: allocatedBudget, color: "var(--rvo-color-oranje-600, #e17000)" },
          { label: "Beschikbaar", value: remaining, color: remaining >= 0 ? "var(--rvo-color-groen-700)" : "var(--rvo-color-rood-600)" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: "var(--rvo-color-hemelblauw-50, #eef4fb)", borderRadius: "4px", padding: "1rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.375rem", fontWeight: 700, color }}>
              <CurrencyDisplay value={value} />
            </div>
            <div style={{ fontSize: "0.8125rem", color: "var(--rvo-color-grijs-700)" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Budget grid editor */}
      <section style={{ marginBottom: "2.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div>
            <Heading level={2} style={{ margin: 0 }}>Budgetplanning</Heading>
            <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.8125rem", color: "var(--rvo-color-grijs-600)" }}>
              Bedragen in euro's per jaar · PERSEX = personele kosten, MATEX = materiële kosten
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
          <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: "1rem", padding: "0.5rem 0", color: "var(--rvo-color-hemelblauw-700)", userSelect: "none" }}>
            Gedetailleerd overzicht per type & bedrag
          </summary>
          <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginBottom: "0.25rem" }}>
              <Link href={`/financiering/${source.id}/types/nieuw`} className="utrecht-button utrecht-button--secondary-action" style={{ fontSize: "0.875rem" }}>+ Type toevoegen</Link>
              {source.types.length > 0 && (
                <Link href={`/financiering/${source.id}/bedragen/nieuw`} className="utrecht-button utrecht-button--secondary-action" style={{ fontSize: "0.875rem" }}>+ Bedrag toevoegen</Link>
              )}
            </div>
            {source.types.map((t) => {
              const typeAmounts = source.amounts.filter(a => a.financialTypeId === t.id);
              const typeTotal = typeAmounts.reduce((s, a) => s + Number(a.amount), 0);
              return (
                <div key={t.id} style={{ border: "1px solid var(--rvo-color-hemelblauw-200, #b3d0ec)", borderRadius: "6px", overflow: "hidden" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1rem", background: "var(--rvo-color-hemelblauw-50, #eef4fb)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <span style={{ fontWeight: 700 }}>{t.type}</span>
                      <span style={{ background: "var(--rvo-color-hemelblauw-100)", color: "var(--rvo-color-hemelblauw-800)", borderRadius: "20px", padding: "0.125rem 0.625rem", fontSize: "0.8125rem", fontWeight: 500 }}>{t.year}</span>
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
                            <td className="utrecht-table__cell"><strong>{formatCurrency(amount.amount)}</strong></td>
                            <td className="utrecht-table__cell"><StatusBadge label={amount.status} color={amount.status === "released" ? "green" : "grey"} /></td>
                            <td className="utrecht-table__cell">{formatDate(amount.effectiveDate)}</td>
                            <td className="utrecht-table__cell">{formatDate(amount.releaseDate)}</td>
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
                    <td className="utrecht-table__cell">
                      {al.position
                        ? <><strong>{al.position.type}</strong> in <Link href={`/teams/${al.position.team.id}`} className="utrecht-link">{al.position.team.name}</Link></>
                        : al.team
                        ? <><Link href={`/teams/${al.team.id}`} className="utrecht-link">{al.team.name}</Link> (team)</>
                        : "—"}
                    </td>
                    <td className="utrecht-table__cell" style={{ fontSize: "0.8125rem", color: "var(--rvo-color-grijs-600)", whiteSpace: "nowrap" }}>
                      {a.financialType ? `${a.financialType.type} ${a.financialType.year}` : "—"}
                    </td>
                    <td className="utrecht-table__cell"><CurrencyDisplay value={al.amount} /></td>
                    <td className="utrecht-table__cell">{al.percentage ? `${al.percentage}%` : "—"}</td>
                    <td className="utrecht-table__cell">
                      <StatusBadge label={al.status} color={al.status === "active" ? "green" : al.status === "reallocated" ? "orange" : "grey"} />
                    </td>
                    <td className="utrecht-table__cell">{formatDate(al.startDate)}</td>
                    <td className="utrecht-table__cell">{al.endDate ? formatDate(al.endDate) : <span style={{ color: "var(--rvo-color-grijs-500)", fontSize: "0.8125rem" }}>Doorlopend</span>}</td>
                    <td className="utrecht-table__cell">{al.reason ?? "—"}</td>
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
