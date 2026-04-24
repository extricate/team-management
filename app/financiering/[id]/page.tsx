import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { Heading1, Heading2, Paragraph } from "@rijkshuisstijl-community/components-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { financialSources, comments, auditEvents } from "@/lib/db/schema";
import { eq, isNull, desc, and } from "drizzle-orm";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CommentSection } from "@/components/ui/CommentSection";
import { AuditLog } from "@/components/ui/AuditLog";

function formatCurrency(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(Number(value));
}

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
        orderBy: (a, { desc }) => [desc(a.createdAt)],
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

  const totalBudget = source.amounts.reduce((s, a) => s + Number(a.amount), 0);
  const releasedBudget = source.amounts.filter(a => a.status === "released").reduce((s, a) => s + Number(a.amount), 0);
  const allocatedBudget = source.amounts.flatMap(a => a.allocations).filter(al => al.status === "active").reduce((s, al) => s + Number(al.amount ?? 0), 0);
  const remaining = releasedBudget - allocatedBudget;

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <Link href="/financiering" className="utrecht-link" style={{ fontSize: "0.875rem" }}>← Terug naar financieringsbronnen</Link>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: "0.75rem" }}>
          <div>
            <Heading1 style={{ margin: "0 0 0.25rem 0" }}>{source.name}</Heading1>
            <Paragraph style={{ margin: 0, color: "var(--rvo-color-grijs-600)" }}>
              Project: <code>{source.projectId}</code> · {source.organisation.name}
            </Paragraph>
          </div>
          <Link href={`/financiering/${source.id}/bewerken`} className="utrecht-button utrecht-button--secondary-action">Bewerken</Link>
        </div>
      </div>

      {/* Budget summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        {[
          { label: "Totaal budget", value: formatCurrency(totalBudget), color: "var(--rvo-color-hemelblauw-700)" },
          { label: "Vrijgegeven", value: formatCurrency(releasedBudget), color: "var(--rvo-color-groen-700)" },
          { label: "Gealloceerd", value: formatCurrency(allocatedBudget), color: "var(--rvo-color-oranje-600, #e17000)" },
          { label: "Beschikbaar", value: formatCurrency(remaining), color: remaining >= 0 ? "var(--rvo-color-groen-700)" : "var(--rvo-color-rood-600)" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: "var(--rvo-color-hemelblauw-50, #eef4fb)", borderRadius: "4px", padding: "1rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.375rem", fontWeight: 700, color }}>{value}</div>
            <div style={{ fontSize: "0.8125rem", color: "var(--rvo-color-grijs-700)" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Financial types by year */}
      <section style={{ marginBottom: "2.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <Heading2>Financiële types</Heading2>
          <Link href={`/financiering/${source.id}/types/nieuw`} className="utrecht-button utrecht-button--secondary-action" style={{ fontSize: "0.875rem" }}>+ Type toevoegen</Link>
        </div>
        {source.types.length === 0
          ? <Paragraph style={{ color: "var(--rvo-color-grijs-600)" }}>Nog geen types aangemaakt.</Paragraph>
          : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {source.types.map((t) => (
                <span key={t.id} style={{ background: "var(--rvo-color-hemelblauw-100, #d3e4f5)", color: "var(--rvo-color-hemelblauw-800)", borderRadius: "20px", padding: "0.25rem 0.875rem", fontSize: "0.875rem", fontWeight: 500 }}>
                  {t.type} · {t.year}
                </span>
              ))}
            </div>
          )}
      </section>

      {/* Amounts */}
      <section style={{ marginBottom: "2.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <Heading2>Bedragen</Heading2>
          <Link href={`/financiering/${source.id}/bedragen/nieuw`} className="utrecht-button utrecht-button--secondary-action" style={{ fontSize: "0.875rem" }}>+ Bedrag toevoegen</Link>
        </div>
        <table className="utrecht-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead className="utrecht-table__header">
            <tr className="utrecht-table__row">
              <th className="utrecht-table__header-cell">Type</th>
              <th className="utrecht-table__header-cell">Bedrag</th>
              <th className="utrecht-table__header-cell">Status</th>
              <th className="utrecht-table__header-cell">Ingangsdatum</th>
              <th className="utrecht-table__header-cell">Vrijgavedatum</th>
              <th className="utrecht-table__header-cell">Allocaties</th>
            </tr>
          </thead>
          <tbody className="utrecht-table__body">
            {source.amounts.length === 0 && (
              <tr className="utrecht-table__row">
                <td className="utrecht-table__cell" colSpan={6} style={{ textAlign: "center", padding: "1.5rem", color: "var(--rvo-color-grijs-600)" }}>Geen bedragen gevonden.</td>
              </tr>
            )}
            {source.amounts.map((amount) => (
              <tr key={amount.id} className="utrecht-table__row">
                <td className="utrecht-table__cell">{amount.financialType ? `${amount.financialType.type} ${amount.financialType.year}` : "—"}</td>
                <td className="utrecht-table__cell"><strong>{formatCurrency(amount.amount)}</strong></td>
                <td className="utrecht-table__cell"><StatusBadge label={amount.status} color={amount.status === "released" ? "green" : "grey"} /></td>
                <td className="utrecht-table__cell">{amount.effectiveDate ? new Date(amount.effectiveDate).toLocaleDateString("nl-NL") : "—"}</td>
                <td className="utrecht-table__cell">{amount.releaseDate ? new Date(amount.releaseDate).toLocaleDateString("nl-NL") : "—"}</td>
                <td className="utrecht-table__cell">{amount.allocations.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Allocations */}
      <section style={{ marginBottom: "2.5rem" }}>
        <Heading2>Allocaties</Heading2>
        <table className="utrecht-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead className="utrecht-table__header">
            <tr className="utrecht-table__row">
              <th className="utrecht-table__header-cell">Doel</th>
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
                <td className="utrecht-table__cell" colSpan={7} style={{ textAlign: "center", padding: "1.5rem", color: "var(--rvo-color-grijs-600)" }}>Geen allocaties gevonden.</td>
              </tr>
            )}
            {source.amounts.flatMap(a => a.allocations).map((al) => (
              <tr key={al.id} className="utrecht-table__row">
                <td className="utrecht-table__cell">
                  {al.position
                    ? <><strong>{al.position.type}</strong> in <Link href={`/teams/${al.position.team.id}`} className="utrecht-link">{al.position.team.name}</Link></>
                    : al.team
                    ? <><Link href={`/teams/${al.team.id}`} className="utrecht-link">{al.team.name}</Link> (team)</>
                    : "—"}
                </td>
                <td className="utrecht-table__cell">{formatCurrency(al.amount)}</td>
                <td className="utrecht-table__cell">{al.percentage ? `${al.percentage}%` : "—"}</td>
                <td className="utrecht-table__cell">
                  <StatusBadge label={al.status} color={al.status === "active" ? "green" : al.status === "reallocated" ? "orange" : "grey"} />
                </td>
                <td className="utrecht-table__cell">{al.startDate ? new Date(al.startDate).toLocaleDateString("nl-NL") : "—"}</td>
                <td className="utrecht-table__cell">{al.endDate ? new Date(al.endDate).toLocaleDateString("nl-NL") : "—"}</td>
                <td className="utrecht-table__cell">{al.reason ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
