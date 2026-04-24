import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { teams, comments, auditEvents, positions } from "@/lib/db/schema";
import { eq, isNull, desc, and } from "drizzle-orm";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CommentSection } from "@/components/ui/CommentSection";
import { AuditLog } from "@/components/ui/AuditLog";

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
      memberships: {
        with: { employee: true },
        orderBy: (m, { desc }) => [desc(m.startDate)],
      },
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

  const activeMembers = team.memberships.filter(m => m.status === "active" && !m.endDate);
  const totalPositions = team.positions.length;
  const filledPositions = team.positions.filter(p => p.status === "filled").length;
  const openPositions = team.positions.filter(p => p.status === "open").length;
  const fundedPositions = team.positions.filter(p => p.fundingAllocations.some(fa => fa.status === "active")).length;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <a href="/teams" className="utrecht-link" style={{ fontSize: "0.875rem" }}>← Terug naar teams</a>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: "0.75rem" }}>
          <div>
            <h1 className="utrecht-heading-1" style={{ margin: "0 0 0.25rem 0" }}>{team.name}</h1>
            <p className="utrecht-paragraph" style={{ margin: 0, color: "var(--rvo-color-grijs-600)" }}>
              {team.organisation.name} · {team.organisation.type}
            </p>
          </div>
          <a href={`/teams/${team.id}/bewerken`} className="utrecht-button utrecht-button--secondary-action">Bewerken</a>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        {[
          { label: "Actieve leden", value: activeMembers.length },
          { label: "Totaal posities", value: totalPositions },
          { label: "Bezette posities", value: filledPositions },
          { label: "Open posities", value: openPositions },
          { label: "Gefinancierd", value: fundedPositions },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: "var(--rvo-color-hemelblauw-50, #eef4fb)", borderRadius: "4px", padding: "1rem", textAlign: "center" }}>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--rvo-color-hemelblauw-700)" }}>{value}</div>
            <div style={{ fontSize: "0.8125rem", color: "var(--rvo-color-grijs-700)" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Positions */}
      <section style={{ marginBottom: "2.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 className="utrecht-heading-2">Posities</h2>
          <a href={`/teams/${team.id}/posities/nieuw`} className="utrecht-button utrecht-button--secondary-action" style={{ fontSize: "0.875rem" }}>+ Positie toevoegen</a>
        </div>
        <table className="utrecht-table" style={{ width: "100%", borderCollapse: "collapse" }}>
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
                <td className="utrecht-table__cell" colSpan={6} style={{ textAlign: "center", padding: "1.5rem", color: "var(--rvo-color-grijs-600)" }}>Geen posities gevonden.</td>
              </tr>
            )}
            {team.positions.map((pos) => {
              const activeAssignment = pos.assignments.find(a => a.status === "active");
              const activeFunding = pos.fundingAllocations.find(fa => fa.status === "active");
              return (
                <tr key={pos.id} className="utrecht-table__row">
                  <td className="utrecht-table__cell"><strong>{pos.type}</strong></td>
                  <td className="utrecht-table__cell">{pos.positionCode ?? "—"}</td>
                  <td className="utrecht-table__cell"><StatusBadge label={pos.status} color={pos.status === "filled" ? "green" : pos.status === "open" ? "orange" : "grey"} /></td>
                  <td className="utrecht-table__cell">
                    {activeAssignment ? `${activeAssignment.employee.firstName} ${activeAssignment.employee.lastName}` : <span style={{ color: "var(--rvo-color-grijs-500)" }}>Onbezet</span>}
                  </td>
                  <td className="utrecht-table__cell">
                    {activeFunding ? <span style={{ color: "var(--rvo-color-groen-700)" }}>✓ {activeFunding.financialSourceAmount.financialSource.name}</span> : <span style={{ color: "var(--rvo-color-grijs-500)" }}>Geen</span>}
                  </td>
                  <td className="utrecht-table__cell">{pos.expectedStart ? new Date(pos.expectedStart).toLocaleDateString("nl-NL") : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* Members */}
      <section style={{ marginBottom: "2.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 className="utrecht-heading-2">Teamleden</h2>
          <a href={`/teams/${team.id}/leden/toevoegen`} className="utrecht-button utrecht-button--secondary-action" style={{ fontSize: "0.875rem" }}>+ Lid toevoegen</a>
        </div>
        <table className="utrecht-table" style={{ width: "100%", borderCollapse: "collapse" }}>
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
                <td className="utrecht-table__cell" colSpan={4} style={{ textAlign: "center", padding: "1.5rem", color: "var(--rvo-color-grijs-600)" }}>Geen actieve leden.</td>
              </tr>
            )}
            {team.memberships.map((m) => (
              <tr key={m.id} className="utrecht-table__row">
                <td className="utrecht-table__cell">
                  <a href={`/medewerkers/${m.employee.id}`} className="utrecht-link">
                    {m.employee.prefixName ? `${m.employee.firstName} ${m.employee.prefixName} ${m.employee.lastName}` : `${m.employee.firstName} ${m.employee.lastName}`}
                  </a>
                </td>
                <td className="utrecht-table__cell"><StatusBadge label={m.status} color={m.status === "active" ? "green" : "grey"} /></td>
                <td className="utrecht-table__cell">{new Date(m.startDate).toLocaleDateString("nl-NL")}</td>
                <td className="utrecht-table__cell">{m.endDate ? new Date(m.endDate).toLocaleDateString("nl-NL") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Comments & Audit */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
        <CommentSection
          comments={teamComments}
          commentableType="team"
          commentableId={team.id}
          currentUserId={session.user.id!}
        />
        <AuditLog events={audit} />
      </div>
    </div>
  );
}
