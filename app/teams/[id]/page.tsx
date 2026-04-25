import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { Heading, Paragraph } from "@rijkshuisstijl-community/components-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { teams, comments, auditEvents, positions } from "@/lib/db/schema";
import { eq, isNull, desc, and } from "drizzle-orm";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CommentSection } from "@/components/ui/CommentSection";
import { AuditLog } from "@/components/ui/AuditLog";
import { formatFullName, formatDate } from "@/lib/utils";

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
          fundingAllocations: { with: { financialSourceAmount: { with: { financialSource: true } } } },
        },
      },
      memberships: { with: { employee: true }, orderBy: (m, { desc }) => [desc(m.startDate)] },
    },
  });

  if (!team) notFound();

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
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <Link href="/teams" className="utrecht-link" style={{ fontSize: "0.875rem" }}>← Terug naar teams</Link>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: "0.75rem" }}>
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
        <table className="utrecht-table">
          <thead className="utrecht-table__header">
            <tr className="utrecht-table__row">
              <th className="utrecht-table__header-cell">Type</th>
              <th className="utrecht-table__header-cell">Code</th>
              <th className="utrecht-table__header-cell">Status</th>
              <th className="utrecht-table__header-cell">Bezet door</th>
              <th className="utrecht-table__header-cell">Financiering</th>
              <th className="utrecht-table__header-cell">Startdatum</th>
            </tr>
          </thead>
          <tbody className="utrecht-table__body">
            {team.positions.length === 0 && (
              <tr className="utrecht-table__row">
                <td className="utrecht-table__cell" colSpan={6} style={{ textAlign: "center", padding: "1.5rem", color: "var(--rvo-color-grijs-600)" }}>
                  Geen posities gevonden.
                </td>
              </tr>
            )}
            {team.positions.map((pos) => {
              const active  = pos.assignments.find(a => a.status === "active");
              const funding = pos.fundingAllocations.find(fa => fa.status === "active");
              return (
                <tr key={pos.id} className="utrecht-table__row">
                  <td className="utrecht-table__cell"><strong>{pos.type}</strong></td>
                  <td className="utrecht-table__cell">{pos.positionCode ?? "—"}</td>
                  <td className="utrecht-table__cell">
                    <StatusBadge label={pos.status} color={pos.status === "filled" ? "green" : pos.status === "open" ? "orange" : "grey"} />
                  </td>
                  <td className="utrecht-table__cell">
                    {active
                      ? <Link href={`/medewerkers/${active.employee.id}`} className="utrecht-link">{active.employee.firstName} {active.employee.lastName}</Link>
                      : <span style={{ color: "var(--rvo-color-grijs-500)" }}>Onbezet</span>}
                  </td>
                  <td className="utrecht-table__cell">
                    {funding
                      ? <span style={{ color: "var(--rvo-color-groen-700)" }}>✓ {funding.financialSourceAmount.financialSource.name}</span>
                      : <span style={{ color: "var(--rvo-color-grijs-500)" }}>Geen</span>}
                  </td>
                  <td className="utrecht-table__cell">
                    {formatDate(pos.expectedStart)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
            </tr>
          </thead>
          <tbody className="utrecht-table__body">
            {activeMembers.length === 0 && (
              <tr className="utrecht-table__row">
                <td className="utrecht-table__cell" colSpan={4} style={{ textAlign: "center", padding: "1.5rem", color: "var(--rvo-color-grijs-600)" }}>
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
