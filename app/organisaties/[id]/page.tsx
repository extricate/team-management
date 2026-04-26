import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { Heading, Paragraph } from "@rijkshuisstijl-community/components-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { organisations, teams, employees, financialSources, positions, comments, auditEvents } from "@/lib/db/schema";
import { eq, isNull, and, desc } from "drizzle-orm";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CommentSection } from "@/components/ui/CommentSection";
import { AuditLog } from "@/components/ui/AuditLog";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { formatCurrency } from "@/lib/utils";

export default async function OrganisatieDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const org = await db.query.organisations.findFirst({
    where: and(eq(organisations.id, params.id), isNull(organisations.deletedAt)),
    with: {
      teams: {
        where: isNull(teams.deletedAt),
        with: {
          positions: { where: isNull(positions.deletedAt) },
          memberships: true,
        },
        orderBy: (t, { asc }) => [asc(t.name)],
      },
      employees: {
        where: isNull(employees.deletedAt),
        orderBy: (e, { asc }) => [asc(e.lastName), asc(e.firstName)],
      },
      financialSources: {
        where: isNull(financialSources.deletedAt),
        with: { amounts: true },
        orderBy: (fs, { asc }) => [asc(fs.name)],
      },
    },
  });

  if (!org) notFound();

  const orgComments = await db.query.comments.findMany({
    where: and(eq(comments.commentableType, "team"), eq(comments.commentableId, params.id)),
    with: { createdByUser: true },
    orderBy: [desc(comments.createdAt)],
  });

  const audit = await db.query.auditEvents.findMany({
    where: and(eq(auditEvents.entityType, "organisation"), eq(auditEvents.entityId, params.id)),
    with: { actorUser: true },
    orderBy: [desc(auditEvents.createdAt)],
    limit: 50,
  });

  const totalPositions  = org.teams.flatMap(t => t.positions).length;
  const filledPositions = org.teams.flatMap(t => t.positions).filter(p => p.status === "filled").length;
  const openPositions   = org.teams.flatMap(t => t.positions).filter(p => p.status === "open").length;
  const totalBudget     = org.financialSources.flatMap(fs => fs.amounts).reduce((s, a) => s + Number(a.amount), 0);

  return (
    <div>
      <Breadcrumbs crumbs={[
        { label: "Organisaties", href: "/organisaties" },
        { label: org.name },
      ]} />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.375rem" }}>
            <Heading level={1} style={{ margin: 0 }}>{org.name}</Heading>
            <StatusBadge label={org.type} color="blue" />
          </div>
          <Paragraph style={{ margin: 0, color: "var(--rvo-color-grijs-600)" }}>
            {org.teams.length} team{org.teams.length !== 1 ? "s" : ""} ·{" "}
            {org.employees.length} medewerker{org.employees.length !== 1 ? "s" : ""}
          </Paragraph>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Link href={`/organisaties/${org.id}/bewerken`} className="utrecht-button utrecht-button--secondary-action">
            Bewerken
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem", marginBottom: "2.5rem" }}>
        {[
          { label: "Teams",           value: org.teams.length },
          { label: "Medewerkers",     value: org.employees.length },
          { label: "Posities (bezet)", value: `${filledPositions}/${totalPositions}` },
          { label: "Open posities",   value: openPositions },
          { label: "Financieringsbronnen", value: org.financialSources.length },
          { label: "Totaal budget",   value: formatCurrency(totalBudget) },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: "var(--rvo-color-hemelblauw-50)", borderRadius: "4px", padding: "1rem", textAlign: "center", border: "1px solid var(--rvo-color-hemelblauw-100)" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--rvo-color-hemelblauw-700)" }}>{value}</div>
            <div style={{ fontSize: "0.8125rem", color: "var(--rvo-color-grijs-700)", marginTop: "0.25rem" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Teams */}
      <section style={{ marginBottom: "2.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <Heading level={2}>Teams</Heading>
          <Link href="/teams/nieuw" className="utrecht-button utrecht-button--secondary-action" style={{ fontSize: "0.875rem" }}>
            + Nieuw team
          </Link>
        </div>
        <table className="utrecht-table">
          <thead className="utrecht-table__header">
            <tr className="utrecht-table__row">
              <th className="utrecht-table__header-cell">Naam</th>
              <th className="utrecht-table__header-cell">Leden</th>
              <th className="utrecht-table__header-cell">Posities (bezet)</th>
              <th className="utrecht-table__header-cell">Acties</th>
            </tr>
          </thead>
          <tbody className="utrecht-table__body">
            {org.teams.length === 0 && (
              <tr className="utrecht-table__row">
                <td className="utrecht-table__cell" colSpan={4} style={{ textAlign: "center", padding: "1.5rem", color: "var(--rvo-color-grijs-600)" }}>
                  Geen teams gevonden.
                </td>
              </tr>
            )}
            {org.teams.map((team) => {
              const activeMembers   = team.memberships.filter(m => m.status === "active" && !m.endDate).length;
              const filled = team.positions.filter(p => p.status === "filled").length;
              const total  = team.positions.length;
              return (
                <tr key={team.id} className="utrecht-table__row">
                  <td className="utrecht-table__cell">
                    <Link href={`/teams/${team.id}`} className="utrecht-link" style={{ fontWeight: 600 }}>{team.name}</Link>
                  </td>
                  <td className="utrecht-table__cell">{activeMembers}</td>
                  <td className="utrecht-table__cell">
                    <span style={{ color: filled === total && total > 0 ? "var(--rvo-color-groen-600)" : "inherit" }}>
                      {filled}/{total}
                    </span>
                  </td>
                  <td className="utrecht-table__cell" style={{ display: "flex", gap: "1rem" }}>
                    <Link href={`/teams/${team.id}`} className="utrecht-link">Bekijken</Link>
                    <Link href={`/teams/${team.id}/bewerken`} className="utrecht-link">Bewerken</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* Financial sources */}
      <section style={{ marginBottom: "2.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <Heading level={2}>Financieringsbronnen</Heading>
          <Link href="/financiering/nieuw" className="utrecht-button utrecht-button--secondary-action" style={{ fontSize: "0.875rem" }}>
            + Nieuwe bron
          </Link>
        </div>
        <table className="utrecht-table">
          <thead className="utrecht-table__header">
            <tr className="utrecht-table__row">
              <th className="utrecht-table__header-cell">Naam</th>
              <th className="utrecht-table__header-cell">Project ID</th>
              <th className="utrecht-table__header-cell">Totaal budget</th>
              <th className="utrecht-table__header-cell">Acties</th>
            </tr>
          </thead>
          <tbody className="utrecht-table__body">
            {org.financialSources.length === 0 && (
              <tr className="utrecht-table__row">
                <td className="utrecht-table__cell" colSpan={4} style={{ textAlign: "center", padding: "1.5rem", color: "var(--rvo-color-grijs-600)" }}>
                  Geen financieringsbronnen gevonden.
                </td>
              </tr>
            )}
            {org.financialSources.map((fs) => {
              const budget = fs.amounts.reduce((s, a) => s + Number(a.amount), 0);
              return (
                <tr key={fs.id} className="utrecht-table__row">
                  <td className="utrecht-table__cell">
                    <Link href={`/financiering/${fs.id}`} className="utrecht-link" style={{ fontWeight: 600 }}>{fs.name}</Link>
                  </td>
                  <td className="utrecht-table__cell"><code>{fs.projectId}</code></td>
                  <td className="utrecht-table__cell">{formatCurrency(budget)}</td>
                  <td className="utrecht-table__cell" style={{ display: "flex", gap: "1rem" }}>
                    <Link href={`/financiering/${fs.id}`} className="utrecht-link">Bekijken</Link>
                    <Link href={`/financiering/${fs.id}/bewerken`} className="utrecht-link">Bewerken</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* Comments & audit */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
        <CommentSection
          comments={orgComments}
          commentableType="team"
          commentableId={org.id}
          currentUserId={session.user.id!}
        />
        <AuditLog events={audit} />
      </div>
    </div>
  );
}
