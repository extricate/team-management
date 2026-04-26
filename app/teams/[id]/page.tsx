import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { Heading, Paragraph } from "@rijkshuisstijl-community/components-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { teams, comments, auditEvents, positions, fundingAllocations, financialSourceAmounts } from "@/lib/db/schema";
import { eq, isNull, desc, and, inArray } from "drizzle-orm";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CommentSection } from "@/components/ui/CommentSection";
import { AuditLog } from "@/components/ui/AuditLog";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { formatFullName, formatDate, formatCurrency } from "@/lib/utils";

export default async function TeamDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const team = await db.query.teams.findFirst({
    where: and(eq(teams.id, params.id), isNull(teams.deletedAt)),
    with: {
      organisation: true,
      positions: {
        where: isNull(positions.deletedAt),
        with: {
          assignments: { with: { employee: true } },
          // Load allocations without nested source amount to avoid alias collision
          // (teams_positions_fundingAllocations_financialSourceAmount_financialSource/Type
          // both truncate to the same 63-char PostgreSQL identifier)
          fundingAllocations: {
            orderBy: (fa, { desc }) => [desc(fa.createdAt)],
          },
        },
      },
      memberships: { with: { employee: true }, orderBy: (m, { desc }) => [desc(m.startDate)] },
    },
  });

  if (!team) notFound();

  // Load source amounts separately to avoid the deep-join alias collision
  const allAmountIds = Array.from(new Set(
    team.positions.flatMap(p => p.fundingAllocations.map(fa => fa.financialSourceAmountId)),
  ));
  const sourceAmounts = allAmountIds.length > 0
    ? await db.query.financialSourceAmounts.findMany({
        where: inArray(financialSourceAmounts.id, allAmountIds),
        with: { financialSource: true, financialType: true },
      })
    : [];
  const sourceAmountMap = new Map(sourceAmounts.map(a => [a.id, a]));

  const teamComments = await db.query.comments.findMany({
    where: and(eq(comments.commentableType, "team"), eq(comments.commentableId, params.id)),
    with: { createdByUser: true },
    orderBy: [desc(comments.createdAt)],
  });

  const audit = await db.query.auditEvents.findMany({
    where: and(eq(auditEvents.entityType, "team"), eq(auditEvents.entityId, params.id)),
    with: { actorUser: true },
    orderBy: [desc(auditEvents.createdAt)],
    limit: 50,
  });

  const activeMembers    = team.memberships.filter(m => m.status === "active" && !m.endDate);
  const totalPositions   = team.positions.length;
  const filledPositions  = team.positions.filter(p => p.status === "filled").length;
  const openPositions    = team.positions.filter(p => p.status === "open").length;
  const fundedPositions  = team.positions.filter(p => p.fundingAllocations.some(fa => fa.status === "active")).length;

  return (
    <div>
      <Breadcrumbs crumbs={[{ label: "Teams", href: "/teams" }, { label: team.name }]} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
        <div>
          <Heading level={1} style={{ margin: "0 0 0.25rem 0" }}>{team.name}</Heading>
          <Paragraph style={{ margin: 0, color: "var(--rvo-color-grijs-600)" }}>
            {team.organisation.name} · {team.organisation.type}
          </Paragraph>
        </div>
        <Link href={`/teams/${team.id}/bewerken`} className="utrecht-button utrecht-button--secondary-action">
          Bewerken
        </Link>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        {[
          { label: "Actieve leden",   value: activeMembers.length },
          { label: "Totaal posities", value: totalPositions },
          { label: "Bezet",           value: filledPositions },
          { label: "Open",            value: openPositions },
          { label: "Gefinancierd",    value: fundedPositions },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: "var(--rvo-color-hemelblauw-50)", borderRadius: "4px", padding: "1rem", textAlign: "center" }}>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--rvo-color-hemelblauw-700)" }}>{value}</div>
            <div style={{ fontSize: "0.8125rem", color: "var(--rvo-color-grijs-700)" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Positions */}
      <section style={{ marginBottom: "2.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <Heading level={2}>Posities</Heading>
          <Link href={`/teams/${team.id}/posities/nieuw`} className="utrecht-button utrecht-button--secondary-action" style={{ fontSize: "0.875rem" }}>
            + Positie toevoegen
          </Link>
        </div>
        {team.positions.length === 0 ? (
          <Paragraph style={{ color: "var(--rvo-color-grijs-600)" }}>Geen posities gevonden.</Paragraph>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {team.positions.map((pos) => {
              const activeAssignment = pos.assignments.find(a => a.status === "active");
              const activeAllocations = pos.fundingAllocations.filter(fa => fa.status === "active");
              const annualCost = Number(pos.annualCost ?? 0);
              const totalAllocated = activeAllocations.reduce((s, fa) => s + Number(fa.amount ?? 0), 0);
              const coveragePct = annualCost > 0 ? Math.min(100, Math.round((totalAllocated / annualCost) * 100)) : null;

              return (
                <div key={pos.id} style={{ border: "1px solid var(--rvo-color-hemelblauw-200, #b3d0ec)", borderRadius: "6px", overflow: "hidden" }}>
                  {/* Position header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1rem", background: "var(--rvo-color-hemelblauw-50, #eef4fb)", flexWrap: "wrap", gap: "0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                      <strong style={{ fontSize: "1rem" }}>{pos.type}</strong>
                      {pos.positionCode && (
                        <span style={{ color: "var(--rvo-color-grijs-600)", fontSize: "0.875rem" }}>{pos.positionCode}</span>
                      )}
                      {pos.schaal && (
                        <span style={{ background: "var(--rvo-color-hemelblauw-100, #d3e4f5)", color: "var(--rvo-color-hemelblauw-800)", borderRadius: "20px", padding: "0.125rem 0.625rem", fontSize: "0.8125rem", fontWeight: 500 }}>
                          Schaal {pos.schaal}
                        </span>
                      )}
                      <StatusBadge label={pos.status} color={pos.status === "filled" ? "green" : pos.status === "open" ? "orange" : "grey"} />
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <Link href={`/teams/${team.id}/posities/${pos.id}/financieren`} className="utrecht-button utrecht-button--secondary-action" style={{ fontSize: "0.8125rem", padding: "0.25rem 0.75rem" }}>
                        + Financieren
                      </Link>
                      <Link href={`/teams/${team.id}/posities/${pos.id}/bewerken`} className="utrecht-link" style={{ fontSize: "0.875rem" }}>
                        Bewerken
                      </Link>
                    </div>
                  </div>

                  {/* Position body */}
                  <div style={{ padding: "0.875rem 1rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem 2rem" }}>
                    {/* Left: occupant + dates */}
                    <div>
                      <div style={{ fontSize: "0.8125rem", color: "var(--rvo-color-grijs-600)", marginBottom: "0.25rem" }}>Bezet door</div>
                      {activeAssignment
                        ? <Link href={`/medewerkers/${activeAssignment.employee.id}`} className="utrecht-link" style={{ fontWeight: 500 }}>
                            {activeAssignment.employee.firstName} {activeAssignment.employee.lastName}
                          </Link>
                        : <span style={{ color: "var(--rvo-color-grijs-500)" }}>Onbezet</span>}
                      {(pos.expectedStart || pos.expectedEnd) && (
                        <div style={{ fontSize: "0.8125rem", color: "var(--rvo-color-grijs-600)", marginTop: "0.375rem" }}>
                          {pos.expectedStart && <>Start: {formatDate(pos.expectedStart)}</>}
                          {pos.expectedStart && pos.expectedEnd && " · "}
                          {pos.expectedEnd && <>Einde: {formatDate(pos.expectedEnd)}</>}
                        </div>
                      )}
                    </div>

                    {/* Right: cost + coverage */}
                    <div>
                      <div style={{ fontSize: "0.8125rem", color: "var(--rvo-color-grijs-600)", marginBottom: "0.25rem" }}>Financiering</div>
                      {annualCost > 0 ? (
                        <>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.375rem" }}>
                            <span style={{ fontWeight: 500 }}>{formatCurrency(totalAllocated)}</span>
                            <span style={{ color: "var(--rvo-color-grijs-600)", fontSize: "0.875rem" }}>/ {formatCurrency(annualCost)} p.j.</span>
                            {coveragePct !== null && (
                              <span style={{
                                background: coveragePct >= 100 ? "var(--rvo-color-groen-100)" : coveragePct > 0 ? "var(--rvo-color-geel-100, #fff9e6)" : "var(--rvo-color-grijs-100)",
                                color: coveragePct >= 100 ? "var(--rvo-color-groen-800)" : coveragePct > 0 ? "var(--rvo-color-oranje-700, #b35900)" : "var(--rvo-color-grijs-700)",
                                borderRadius: "20px", padding: "0.125rem 0.625rem", fontSize: "0.8125rem", fontWeight: 600,
                              }}>
                                {coveragePct}%
                              </span>
                            )}
                          </div>
                          {/* Progress bar */}
                          <div style={{ height: "6px", background: "var(--rvo-color-grijs-200)", borderRadius: "3px", overflow: "hidden", marginBottom: "0.5rem" }}>
                            <div style={{ height: "100%", width: `${coveragePct ?? 0}%`, background: coveragePct! >= 100 ? "var(--rvo-color-groen-600)" : "var(--rvo-color-hemelblauw-500)", borderRadius: "3px", transition: "width 0.2s" }} />
                          </div>
                        </>
                      ) : (
                        <span style={{ color: "var(--rvo-color-grijs-500)", fontSize: "0.875rem" }}>Geen kosten ingesteld</span>
                      )}
                      {/* Funding streams */}
                      {activeAllocations.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                          {activeAllocations.map(fa => {
                            const sa = sourceAmountMap.get(fa.financialSourceAmountId);
                            const typeSuffix = sa?.financialType
                              ? ` · ${sa.financialType.type} ${sa.financialType.year}`
                              : "";
                            return (
                              <div key={fa.id} style={{ fontSize: "0.8125rem", color: "var(--rvo-color-grijs-700)" }}>
                                <span style={{ color: "var(--rvo-color-groen-700)", marginRight: "0.25rem" }}>✓</span>
                                {sa?.financialSource.name ?? "—"}{typeSuffix}
                                {fa.amount && <span style={{ marginLeft: "0.375rem", color: "var(--rvo-color-grijs-600)" }}>({formatCurrency(fa.amount)})</span>}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Members */}
      <section style={{ marginBottom: "2.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <Heading level={2}>Teamleden</Heading>
          <Link href={`/teams/${team.id}/leden/toevoegen`} className="utrecht-button utrecht-button--secondary-action" style={{ fontSize: "0.875rem" }}>
            + Lid toevoegen
          </Link>
        </div>
        <table className="utrecht-table">
          <thead className="utrecht-table__header">
            <tr className="utrecht-table__row">
              <th className="utrecht-table__header-cell">Naam</th>
              <th className="utrecht-table__header-cell">Status</th>
              <th className="utrecht-table__header-cell">Startdatum</th>
              <th className="utrecht-table__header-cell">Einddatum</th>
              <th className="utrecht-table__header-cell"></th>
            </tr>
          </thead>
          <tbody className="utrecht-table__body">
            {activeMembers.length === 0 && (
              <tr className="utrecht-table__row">
                <td className="utrecht-table__cell" colSpan={5} style={{ textAlign: "center", padding: "1.5rem", color: "var(--rvo-color-grijs-600)" }}>
                  Geen actieve leden.
                </td>
              </tr>
            )}
            {team.memberships.map((m) => (
              <tr key={m.id} className="utrecht-table__row">
                <td className="utrecht-table__cell">
                  <Link href={`/medewerkers/${m.employee.id}`} className="utrecht-link">
                    {formatFullName(m.employee)}
                  </Link>
                </td>
                <td className="utrecht-table__cell"><StatusBadge label={m.status} color={m.status === "active" ? "green" : "grey"} /></td>
                <td className="utrecht-table__cell">{formatDate(m.startDate)}</td>
                <td className="utrecht-table__cell">{formatDate(m.endDate)}</td>
                <td className="utrecht-table__cell" style={{ whiteSpace: "nowrap" }}>
                  <Link href={`/teams/${team.id}/leden/${m.id}/bewerken`} className="utrecht-link" style={{ fontSize: "0.875rem" }}>Bewerken</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
        <CommentSection comments={teamComments} commentableType="team" commentableId={team.id} currentUserId={session.user.id!} />
        <AuditLog events={audit} />
      </div>
    </div>
  );
}
