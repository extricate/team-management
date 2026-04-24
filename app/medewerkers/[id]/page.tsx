import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { employees, comments, auditEvents } from "@/lib/db/schema";
import { eq, isNull, desc, and } from "drizzle-orm";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CommentSection } from "@/components/ui/CommentSection";
import { AuditLog } from "@/components/ui/AuditLog";

export default async function MedewerkerDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const emp = await db.query.employees.findFirst({
    where: and(eq(employees.id, params.id), isNull(employees.deletedAt)),
    with: {
      organisation: true,
      memberships: {
        with: { team: true, createdByUser: true },
        orderBy: (m, { desc }) => [desc(m.startDate)],
      },
      positionAssignments: {
        with: { position: { with: { team: true } }, createdByUser: true },
        orderBy: (pa, { desc }) => [desc(pa.startDate)],
      },
    },
  });

  if (!emp) notFound();

  const empComments = await db.query.comments.findMany({
    where: and(eq(comments.commentableType, "employee"), eq(comments.commentableId, params.id)),
    with: { createdByUser: true },
    orderBy: [desc(comments.createdAt)],
  });

  const audit = await db.query.auditEvents.findMany({
    where: and(eq(auditEvents.entityType, "employee"), eq(auditEvents.entityId, params.id)),
    with: { actorUser: true },
    orderBy: [desc(auditEvents.createdAt)],
    limit: 50,
  });

  const fullName = emp.prefixName
    ? `${emp.firstName} ${emp.prefixName} ${emp.lastName}`
    : `${emp.firstName} ${emp.lastName}`;

  const activeTeams = emp.memberships.filter(m => m.status === "active" && !m.endDate);
  const activePosition = emp.positionAssignments.find(a => a.status === "active");

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <a href="/medewerkers" className="utrecht-link" style={{ fontSize: "0.875rem" }}>← Terug naar medewerkers</a>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: "0.75rem" }}>
          <div>
            <h1 className="utrecht-heading-1" style={{ margin: "0 0 0.25rem 0" }}>{fullName}</h1>
            <p className="utrecht-paragraph" style={{ margin: 0, color: "var(--rvo-color-grijs-600)" }}>
              {emp.organisation.name}
              {activePosition && <> · Positie: <strong>{activePosition.position.type}</strong></>}
            </p>
          </div>
          <a href={`/medewerkers/${emp.id}/bewerken`} className="utrecht-button utrecht-button--secondary-action">Bewerken</a>
        </div>
      </div>

      {/* Current status */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2.5rem" }}>
        <div style={{ background: "var(--rvo-color-hemelblauw-50, #eef4fb)", padding: "1.25rem", borderRadius: "4px" }}>
          <h3 style={{ margin: "0 0 0.75rem 0", fontSize: "0.9375rem", fontWeight: 600 }}>Actieve teams</h3>
          {activeTeams.length === 0
            ? <p style={{ margin: 0, color: "var(--rvo-color-grijs-600)" }}>Geen actieve teamlidmaatschappen</p>
            : activeTeams.map(m => (
              <div key={m.id} style={{ marginBottom: "0.5rem" }}>
                <a href={`/teams/${m.team.id}`} className="utrecht-link">{m.team.name}</a>
                <span style={{ fontSize: "0.8125rem", color: "var(--rvo-color-grijs-600)", marginLeft: "0.5rem" }}>
                  vanaf {new Date(m.startDate).toLocaleDateString("nl-NL")}
                </span>
              </div>
            ))}
        </div>
        <div style={{ background: "var(--rvo-color-hemelblauw-50, #eef4fb)", padding: "1.25rem", borderRadius: "4px" }}>
          <h3 style={{ margin: "0 0 0.75rem 0", fontSize: "0.9375rem", fontWeight: 600 }}>Huidige positie</h3>
          {activePosition
            ? (
              <div>
                <strong>{activePosition.position.type}</strong>
                {activePosition.position.positionCode && <span style={{ marginLeft: "0.5rem", color: "var(--rvo-color-grijs-600)" }}>({activePosition.position.positionCode})</span>}
                <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.8125rem", color: "var(--rvo-color-grijs-600)" }}>
                  Team: {activePosition.position.team.name} · Sinds {new Date(activePosition.startDate).toLocaleDateString("nl-NL")}
                </p>
              </div>
            )
            : <p style={{ margin: 0, color: "var(--rvo-color-grijs-600)" }}>Geen actieve positie</p>}
        </div>
      </div>

      {/* Position assignment history */}
      <section style={{ marginBottom: "2.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 className="utrecht-heading-2">Positiegeschiedenis</h2>
          <a href={`/medewerkers/${emp.id}/posities/toewijzen`} className="utrecht-button utrecht-button--secondary-action" style={{ fontSize: "0.875rem" }}>+ Positie toewijzen</a>
        </div>
        <table className="utrecht-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead className="utrecht-table__header">
            <tr className="utrecht-table__row">
              <th className="utrecht-table__header-cell">Positie</th>
              <th className="utrecht-table__header-cell">Team</th>
              <th className="utrecht-table__header-cell">Status</th>
              <th className="utrecht-table__header-cell">Van</th>
              <th className="utrecht-table__header-cell">Tot</th>
              <th className="utrecht-table__header-cell">Reden</th>
              <th className="utrecht-table__header-cell">Door</th>
            </tr>
          </thead>
          <tbody className="utrecht-table__body">
            {emp.positionAssignments.length === 0 && (
              <tr className="utrecht-table__row">
                <td className="utrecht-table__cell" colSpan={7} style={{ textAlign: "center", padding: "1.5rem", color: "var(--rvo-color-grijs-600)" }}>Geen positietoewijzingen gevonden.</td>
              </tr>
            )}
            {emp.positionAssignments.map((pa) => (
              <tr key={pa.id} className="utrecht-table__row">
                <td className="utrecht-table__cell"><strong>{pa.position.type}</strong></td>
                <td className="utrecht-table__cell">
                  <a href={`/teams/${pa.position.team.id}`} className="utrecht-link">{pa.position.team.name}</a>
                </td>
                <td className="utrecht-table__cell"><StatusBadge label={pa.status} color={pa.status === "active" ? "green" : "grey"} /></td>
                <td className="utrecht-table__cell">{new Date(pa.startDate).toLocaleDateString("nl-NL")}</td>
                <td className="utrecht-table__cell">{pa.endDate ? new Date(pa.endDate).toLocaleDateString("nl-NL") : "—"}</td>
                <td className="utrecht-table__cell">{pa.reason ?? "—"}</td>
                <td className="utrecht-table__cell">{pa.createdByUser?.name ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Team membership history */}
      <section style={{ marginBottom: "2.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 className="utrecht-heading-2">Teamlidmaatschappen</h2>
          <a href={`/medewerkers/${emp.id}/teams/toevoegen`} className="utrecht-button utrecht-button--secondary-action" style={{ fontSize: "0.875rem" }}>+ Team toevoegen</a>
        </div>
        <table className="utrecht-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead className="utrecht-table__header">
            <tr className="utrecht-table__row">
              <th className="utrecht-table__header-cell">Team</th>
              <th className="utrecht-table__header-cell">Status</th>
              <th className="utrecht-table__header-cell">Van</th>
              <th className="utrecht-table__header-cell">Tot</th>
              <th className="utrecht-table__header-cell">Reden</th>
            </tr>
          </thead>
          <tbody className="utrecht-table__body">
            {emp.memberships.map((m) => (
              <tr key={m.id} className="utrecht-table__row">
                <td className="utrecht-table__cell">
                  <a href={`/teams/${m.team.id}`} className="utrecht-link">{m.team.name}</a>
                </td>
                <td className="utrecht-table__cell"><StatusBadge label={m.status} color={m.status === "active" ? "green" : "grey"} /></td>
                <td className="utrecht-table__cell">{new Date(m.startDate).toLocaleDateString("nl-NL")}</td>
                <td className="utrecht-table__cell">{m.endDate ? new Date(m.endDate).toLocaleDateString("nl-NL") : "—"}</td>
                <td className="utrecht-table__cell">{m.reason ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Comments & Audit */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
        <CommentSection
          comments={empComments}
          commentableType="employee"
          commentableId={emp.id}
          currentUserId={session.user.id!}
        />
        <AuditLog events={audit} />
      </div>
    </div>
  );
}
