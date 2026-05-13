import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, Heading, LinkList, LinkListCard, LinkListLink, Paragraph } from "@rijkshuisstijl-community/components-react";
import { auth } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { loadDashboardData } from "@/lib/loaders/dashboard";

export const metadata: Metadata = { title: "Dashboard – Teambeheer" };

const actionLabels: Record<string, string> = {
  create: "Aangemaakt",
  update: "Bijgewerkt",
  archive: "Gearchiveerd",
  assign: "Toegewezen",
  reallocate: "Herverdeeld",
  delete: "Verwijderd",
};

const entityLabels: Record<string, string> = {
  organisation: "Organisatie",
  team: "Team",
  employee: "Medewerker",
  position: "Positie",
  financialSource: "Financieringsbron",
  fundingAllocation: "Allocatie",
  teamMembership: "Teamlidmaatschap",
  positionAssignment: "Positietoewijzing",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const { stats, conflicts, upcomingEvents, recentActivity } = await loadDashboardData();

  const lateStartConflicts = conflicts.filter(c => c.type === "late_start");
  const unfundedConflicts  = conflicts.filter(c => c.type === "unfunded");

  const statTiles = [
    { label: "Organisaties",       value: stats.orgCount,      href: "/organisaties", color: "var(--rvo-color-hemelblauw-700, #154273)" },
    { label: "Teams",              value: stats.teamCount,     href: "/teams",        color: "var(--rvo-color-hemelblauw-700, #154273)" },
    { label: "Medewerkers",        value: stats.employeeCount, href: "/medewerkers",  color: "var(--rvo-color-hemelblauw-700, #154273)" },
    { label: "Posities bezet",     value: `${stats.filledPositions}/${stats.totalPositions}`, href: null,
      color: stats.filledPositions === stats.totalPositions && stats.totalPositions > 0
        ? "var(--rvo-color-groen-700, #155724)"
        : "var(--rvo-color-hemelblauw-700, #154273)" },
    { label: "Open posities",      value: stats.openPositions, href: null,
      color: stats.openPositions > 0 ? "var(--rvo-color-oranje-600, #e17000)" : "var(--rvo-color-groen-700, #155724)" },
    { label: "Budget vrijgegeven", value: CurrencyDisplay({ value: stats.releasedBudget }), href: "/financiering",
      color: "var(--rvo-color-groen-700, #155724)" },
  ];

  const quickLinks = [
    { href: "/organisaties/nieuw", label: "Nieuwe organisatie" },
    { href: "/teams/nieuw",        label: "Nieuw team" },
    { href: "/medewerkers/nieuw",  label: "Nieuwe medewerker" },
    { href: "/financiering/nieuw", label: "Nieuwe financieringsbron" },
    { href: "/indelen",            label: "Teamleden indelen" },
  ];

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: "2rem" }}>
        <Heading level={1} style={{ margin: "0 0 0.25rem" }}>Dashboard</Heading>
        <Paragraph style={{ margin: 0, color: "var(--rvo-color-grijs-600, #5a5a5a)" }}>
          Welkom terug, <strong>{session.user.name ?? session.user.email}</strong>.
        </Paragraph>
      </div>

      {/* Stat tiles */}
      <div className="stat-tiles">
        {statTiles.map(({ label, value, href, color }) => href ? (
          <Link key={label} href={href} className="stat-tile">
            <strong className="stat-tile__value" style={{ color }}>{value}</strong>
            <span className="stat-tile__label">{label}</span>
          </Link>
        ) : (
          <div key={label} className="stat-tile">
            <strong className="stat-tile__value" style={{ color }}>{value}</strong>
            <span className="stat-tile__label">{label}</span>
          </div>
        ))}
      </div>

      {/* Conflicts — compact table instead of individual banners */}
      {conflicts.length > 0 && (
        <section style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <Heading level={2} style={{ margin: 0 }}>Aandachtspunten</Heading>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {lateStartConflicts.length > 0 && (
                <StatusBadge label={`${lateStartConflicts.length} late start`} color="red" />
              )}
              {unfundedConflicts.length > 0 && (
                <StatusBadge label={`${unfundedConflicts.length} niet gefinancierd`} color="orange" />
              )}
            </div>
          </div>
          <table className="utrecht-table">
            <thead className="utrecht-table__header">
              <tr className="utrecht-table__row">
                <th className="utrecht-table__header-cell" style={{ width: "8rem" }}>Type</th>
                <th className="utrecht-table__header-cell">Team</th>
                <th className="utrecht-table__header-cell">Positie</th>
                <th className="utrecht-table__header-cell">Toelichting</th>
              </tr>
            </thead>
            <tbody className="utrecht-table__body">
              {lateStartConflicts.map(c => (
                <tr key={`late-${c.positionId}`} className="utrecht-table__row">
                  <td className="utrecht-table__cell">
                    <StatusBadge label="Late start" color="red" />
                  </td>
                  <td className="utrecht-table__cell">
                    <Link href={`/teams/${c.teamId}`} className="utrecht-link">{c.teamName}</Link>
                  </td>
                  <td className="utrecht-table__cell">{c.positionType}</td>
                  <td className="utrecht-table__cell field-label">
                    Start {c.expectedStart ? formatDate(c.expectedStart) : "?"}, vereist vóór {c.requiredBefore ? formatDate(c.requiredBefore) : "?"}
                  </td>
                </tr>
              ))}
              {unfundedConflicts.map(c => (
                <tr key={`unfunded-${c.positionId}`} className="utrecht-table__row">
                  <td className="utrecht-table__cell">
                    <StatusBadge label="Niet gefinancierd" color="orange" />
                  </td>
                  <td className="utrecht-table__cell">
                    <Link href={`/teams/${c.teamId}`} className="utrecht-link">{c.teamName}</Link>
                  </td>
                  <td className="utrecht-table__cell">{c.positionType}</td>
                  <td className="utrecht-table__cell field-label">
                    {c.expectedStart ? `Start ${formatDate(c.expectedStart)}` : "Geen startdatum"} · geen actieve financiering
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Two-column: upcoming events | quick links + finance */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "start", marginBottom: "2rem" }}>

        {/* Upcoming events */}
        <Card heading="Aankomende gebeurtenissen" headingLevel={2} style={{ maxInlineSize: "none", width: "100%" }}>
          {upcomingEvents.length === 0 ? (
            <Paragraph style={{ color: "var(--rvo-color-grijs-600, #5a5a5a)", margin: 0 }}>
              Geen gebeurtenissen in de komende 90 dagen.
            </Paragraph>
          ) : (
            <div>
              {upcomingEvents.map((ev, i) => (
                <div
                  key={`${ev.kind}-${ev.entityId}-${i}`}
                  style={{
                    display: "flex",
                    gap: "1rem",
                    alignItems: "baseline",
                    padding: "0.5rem 0",
                    borderBottom: i < upcomingEvents.length - 1 ? "1px solid var(--rvo-color-grijs-100, #f1f1f1)" : "none",
                    fontSize: "0.875rem",
                  }}
                >
                  <span
                    style={{
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                      color: ev.daysUntil <= 14
                        ? "var(--rvo-color-rood-700, #c0392b)"
                        : ev.daysUntil <= 30
                        ? "var(--rvo-color-oranje-600, #e17000)"
                        : "var(--rvo-color-grijs-600, #5a5a5a)",
                    }}
                  >
                    {formatDate(ev.date)}
                    <span style={{ marginLeft: "0.375rem", fontSize: "0.75rem" }}>
                      ({ev.daysUntil === 0 ? "vandaag" : ev.daysUntil === 1 ? "morgen" : `${ev.daysUntil}d`})
                    </span>
                  </span>
                  <span style={{ color: "var(--rvo-color-grijs-700, #4a4a4a)" }}>{ev.label}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Quick links + Finance stacked */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <LinkListCard headingLevel={2} heading="Snel toevoegen">
            <LinkList>
              {quickLinks.map(({ href, label }) => (
                <LinkListLink key={href} href={href}>{label}</LinkListLink>
              ))}
            </LinkList>
          </LinkListCard>

          <Card heading="Financieringsoverzicht" headingLevel={2} style={{ maxInlineSize: "none", width: "100%" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {[
                { label: "Vrijgegeven budget", value: formatCurrency(stats.releasedBudget),                           color: "var(--rvo-color-groen-700, #155724)" },
                { label: "Concept budget",     value: formatCurrency(stats.conceptBudget),                            color: "var(--rvo-color-oranje-600, #e17000)" },
                { label: "Totaal",             value: formatCurrency(stats.releasedBudget + stats.conceptBudget),     color: "inherit" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span className="field-label" style={{ marginBottom: 0 }}>{label}</span>
                  <strong style={{ color }}>{value}</strong>
                </div>
              ))}
            </div>
            <div style={{ marginTop: "1rem" }}>
              <Link href="/financiering" className="utrecht-link" style={{ fontSize: "0.875rem" }}>
                Naar financieringsoverzicht
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* Recent activity */}
      {recentActivity.length > 0 && (
        <Card heading="Recente activiteit" headingLevel={2} style={{ maxInlineSize: "none", width: "100%" }}>
          <div>
            {recentActivity.map((ev, i) => (
              <div
                key={ev.id}
                style={{
                  display: "flex",
                  gap: "1rem",
                  alignItems: "baseline",
                  padding: "0.5rem 0",
                  borderBottom: i < recentActivity.length - 1 ? "1px solid var(--rvo-color-grijs-100, #f1f1f1)" : "none",
                  fontSize: "0.875rem",
                }}
              >
                <span style={{ color: "var(--rvo-color-grijs-500, #767676)", whiteSpace: "nowrap", flexShrink: 0 }}>
                  {formatDate(ev.createdAt)}
                </span>
                <span>
                  <strong>{actionLabels[ev.action] ?? ev.action}</strong>
                  {" "}
                  <span style={{ color: "var(--rvo-color-grijs-600, #5a5a5a)" }}>
                    {entityLabels[ev.entityType] ?? ev.entityType}
                  </span>
                  {" door "}
                  <span style={{ color: "var(--rvo-color-grijs-700, #4a4a4a)" }}>
                    {ev.actorUser?.name ?? ev.actorUser?.email ?? "Systeem"}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
