import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { Card, Heading, Paragraph } from "@rijkshuisstijl-community/components-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { employees } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { fetchDetailSidebar } from "@/lib/loaders/detail";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CommentSection } from "@/components/ui/CommentSection";
import { AuditLog } from "@/components/ui/AuditLog";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ArchiveButton } from "@/components/ui/ArchiveButton";
import { ArchivedBanner } from "@/components/ui/ArchivedBanner";
import { FilterableMembershipsTable } from "@/components/ui/FilterableMembershipsTable";
import { formatFullName, formatDate, buildEntityMetadata } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const emp = await db.query.employees.findFirst({ where: eq(employees.id, id) });
  return buildEntityMetadata(emp ? formatFullName(emp) : undefined, "Medewerker");
}

export default async function MedewerkerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const emp = await db.query.employees.findFirst({
    where: eq(employees.id, id),
    with: {
      organisation: true,
      memberships: { with: { team: true, createdByUser: true }, orderBy: (m, { desc }) => [desc(m.startDate)] },
      positionAssignments: { with: { position: { with: { teamCouplings: { with: { team: true } } } }, createdByUser: true }, orderBy: (pa, { desc }) => [desc(pa.startDate)] },
    },
  });

  if (!emp) notFound();

  const isArchived = !!emp.deletedAt;

  const { comments: empComments, audit } = await fetchDetailSidebar("employee", id);

  const fullName      = formatFullName(emp);
  const activeTeams   = emp.memberships.filter(m => m.status === "active" && !m.endDate);
  const activePos     = emp.positionAssignments.find(a => a.status === "active");

  return (
    <div>
      <Breadcrumbs crumbs={[{ label: "Medewerkers", href: "/medewerkers" }, { label: fullName }]} />
      {isArchived && <ArchivedBanner deletedAt={emp.deletedAt!} entityLabel={fullName} />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
        <div>
          <Heading level={1} style={{ margin: "0 0 0.25rem 0" }}>{fullName}</Heading>
          <Paragraph style={{ margin: 0, color: "var(--rvo-color-grijs-600)" }}>
            {emp.organisation.name}
            {emp.personeelsnummer && <> · <span title="Personeelsnummer">{emp.personeelsnummer}</span></>}
            {activePos && <> · Positie: <strong>{activePos.position.type}</strong></>}
          </Paragraph>
        </div>
        {!isArchived && (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Link href={`/medewerkers/${emp.id}/bewerken`} className="utrecht-button utrecht-button--secondary-action">Bewerken</Link>
            <ArchiveButton
              entityName={fullName}
              apiPath={`/api/employees/${emp.id}`}
              redirectTo="/medewerkers"
              warningText="Actieve teamlidmaatschappen en positietoewijzingen worden afgesloten."
            />
          </div>
        )}
      </div>

      {/* Current status */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2.5rem" }}>
        <Card heading="Actieve teams" headingLevel={3} style={{ maxInlineSize: "none", width: "100%" }}>
          {activeTeams.length === 0
            ? <Paragraph style={{ margin: 0, color: "var(--rvo-color-grijs-600)" }}>Geen actieve teamlidmaatschappen</Paragraph>
            : activeTeams.map(m => (
              <div key={m.id} style={{ marginBottom: "0.5rem" }}>
                <Link href={`/teams/${m.team.id}`} className="utrecht-link">{m.team.name}</Link>
                <span style={{ fontSize: "0.8125rem", color: "var(--rvo-color-grijs-600)", marginLeft: "0.5rem" }}>
                  vanaf {formatDate(m.startDate)}
                </span>
              </div>
            ))}
        </Card>
        <Card heading="Huidige positie" headingLevel={3} style={{ maxInlineSize: "none", width: "100%" }}>
          {activePos
            ? <div>
                <strong>{activePos.position.type}</strong>
                {activePos.position.positionCode && <span style={{ marginLeft: "0.5rem", color: "var(--rvo-color-grijs-600)" }}>({activePos.position.positionCode})</span>}
                <Paragraph style={{ margin: "0.25rem 0 0", fontSize: "0.8125rem", color: "var(--rvo-color-grijs-600)" }}>
                  Team: {activePos.position.teamCouplings[0]?.team?.name ?? "—"} · Sinds {formatDate(activePos.startDate)}
                </Paragraph>
              </div>
            : <Paragraph style={{ margin: 0, color: "var(--rvo-color-grijs-600)" }}>Geen actieve positie</Paragraph>}
        </Card>
      </div>

      {/* Position history */}
      <section style={{ marginBottom: "2.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <Heading level={2}>Positiegeschiedenis</Heading>
          {!isArchived && (
            <Link href={`/medewerkers/${emp.id}/posities/toewijzen`} className="utrecht-button utrecht-button--secondary-action" style={{ fontSize: "0.875rem" }}>
              Positie toewijzen
            </Link>
          )}
        </div>
        <table className="utrecht-table">
          <thead className="utrecht-table__header">
            <tr className="utrecht-table__row">
              <th className="utrecht-table__header-cell">Positie</th>
              <th className="utrecht-table__header-cell">Team</th>
              <th className="utrecht-table__header-cell">Status</th>
              <th className="utrecht-table__header-cell">Van</th>
              <th className="utrecht-table__header-cell">Tot</th>
              <th className="utrecht-table__header-cell">Reden</th>
              <th className="utrecht-table__header-cell">Door</th>
              <th className="utrecht-table__header-cell"></th>
            </tr>
          </thead>
          <tbody className="utrecht-table__body">
            {emp.positionAssignments.length === 0 && (
              <tr className="utrecht-table__row">
                <td className="utrecht-table__cell" colSpan={8} style={{ textAlign: "center", padding: "1.5rem", color: "var(--rvo-color-grijs-600)" }}>Geen positietoewijzingen.</td>
              </tr>
            )}
            {emp.positionAssignments.map((pa) => (
              <tr key={pa.id} className="utrecht-table__row">
                <td className="utrecht-table__cell"><strong>{pa.position.type}</strong></td>
                <td className="utrecht-table__cell">
                  {pa.position.teamCouplings[0]?.team
                    ? <Link href={`/teams/${pa.position.teamCouplings[0].team.id}`} className="utrecht-link">{pa.position.teamCouplings[0].team.name}</Link>
                    : "—"}
                </td>
                <td className="utrecht-table__cell"><StatusBadge label={pa.status} color={pa.status === "active" ? "green" : "grey"} /></td>
                <td className="utrecht-table__cell" style={{ whiteSpace: "nowrap" }}>{formatDate(pa.startDate)}</td>
                <td className="utrecht-table__cell" style={{ whiteSpace: "nowrap" }}>{formatDate(pa.endDate)}</td>
                <td className="utrecht-table__cell" style={{ maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={pa.reason ?? undefined}>{pa.reason ?? "—"}</td>
                <td className="utrecht-table__cell" style={{ whiteSpace: "nowrap" }}>{pa.createdByUser?.name ?? "—"}</td>
                <td className="utrecht-table__cell" style={{ whiteSpace: "nowrap" }}>
                  <Link href={`/medewerkers/${emp.id}/posities/${pa.id}/bewerken`} className="utrecht-link" style={{ fontSize: "0.875rem" }}>Bewerken</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Team membership history */}
      <section style={{ marginBottom: "2.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <Heading level={2}>Teamlidmaatschappen</Heading>
          {!isArchived && (
            <Link href={`/medewerkers/${emp.id}/teams/toevoegen`} className="utrecht-button utrecht-button--secondary-action" style={{ fontSize: "0.875rem" }}>
              Team toevoegen
            </Link>
          )}
        </div>
        <FilterableMembershipsTable employeeId={emp.id} memberships={emp.memberships} />
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
        <CommentSection comments={empComments} commentableType="employee" commentableId={emp.id} currentUserId={session.user.id!} />
        <AuditLog events={audit} />
      </div>
    </div>
  );
}
