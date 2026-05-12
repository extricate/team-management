import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert, Card, Heading, LinkList, LinkListCard, LinkListLink, Paragraph } from "@rijkshuisstijl-community/components-react";
import { auth } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
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
    { label: "Organisaties",    value: stats.orgCount,      href: "/organisaties", color: "var(--rvo-color-hemelblauw-700)" },
    { label: "Teams",           value: stats.teamCount,     href: "/teams",        color: "var(--rvo-color-hemelblauw-700)" },
    { label: "Medewerkers",     value: stats.employeeCount, href: "/medewerkers",  color: "var(--rvo-color-hemelblauw-700)" },
    { label: "Posities bezet",  value: `${stats.filledPositions}/${stats.totalPositions}`, href: null,
      color: stats.filledPositions === stats.totalPositions && stats.totalPositions > 0 ? "var(--rvo-color-groen-700)" : "var(--rvo-color-hemelblauw-700)" },
    { label: "Open posities",   value: stats.openPositions, href: null,
      color: stats.openPositions > 0 ? "var(--rvo-color-oranje-600, #e17000)" : "var(--rvo-color-groen-700)" },
    { label: "Budget vrijgegeven", value: CurrencyDisplay({ value: stats.releasedBudget }), href: "/financiering",
      color: "var(--rvo-color-groen-700)" },
  ];

  const quickLinks = [
    { href: "/organisaties/nieuw",  label: "Nieuwe organisatie" },
    { href: "/teams/nieuw",         label: "Nieuw team" },
    { href: "/medewerkers/nieuw",   label: "Nieuwe medewerker" },
    { href: "/financiering/nieuw",  label: "Nieuwe financieringsbron" },
    { href: "/indelen",             label: "Teamleden indelen" },
  ];

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <Heading level={1} style={{ margin: "0 0 0.5rem" }}>Dashboard</Heading>
        <Paragraph style={{ margin: 0, color: "var(--rvo-color-grijs-600)" }}>
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

      {/* Conflicts */}
      {conflicts.length > 0 && (
        <section style={{ marginBottom: "2.5rem" }}>
          <Heading level={2} style={{ marginBottom: "1rem" }}>
            Conflicten ({conflicts.length})
          </Heading>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {lateStartConflicts.map(c => (
              <Alert key={`late-${c.positionId}`} type="error">
                <Paragraph>
                  <strong>Late start:</strong>{" "}
                  <Link href={`/teams/${c.teamId}`} className="utrecht-link">{c.teamName}</Link>
                  {" — "}<em>{c.positionType}</em>
                  {" "}verwacht te starten op{" "}
                  <strong>{c.expectedStart ? formatDate(c.expectedStart) : "?"}</strong>
                  {", maar vereist vóór "}
                  <strong>{c.requiredBefore ? formatDate(c.requiredBefore) : "?"}</strong>.
                </Paragraph>
              </Alert>
            ))}
            {unfundedConflicts.map(c => (
              <Alert key={`unfunded-${c.positionId}`} type="warning">
                <Paragraph>
                  <strong>Niet gefinancierd:</strong>{" "}
                  <Link href={`/teams/${c.teamId}`} className="utrecht-link">{c.teamName}</Link>
                  {" — "}<em>{c.positionType}</em>
                  {" "}({c.expectedStart ? `start ${formatDate(c.expectedStart)}` : "geen startdatum"}) heeft nog geen actieve financiering.
                </Paragraph>
              </Alert>
            ))}
          </div>
        </section>
      )}

      {/* Upcoming events */}
      {upcomingEvents.length > 0 && (
        <section style={{ marginBottom: "2.5rem" }}>
          <Heading level={2} style={{ marginBottom: "1rem" }}>
            Aankomende gebeurtenissen (90 dagen)
          </Heading>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            {upcomingEvents.map((ev, i) => (
              <div key={`${ev.kind}-${ev.entityId}-${i}`} style={{ display: "flex", gap: "1rem", alignItems: "baseline", padding: "0.5rem 0", borderBottom: "1px solid var(--rvo-color-grijs-100, #f1f1f1)", fontSize: "0.875rem" }}>
                <span style={{ whiteSpace: "nowrap", flexShrink: 0, color: ev.daysUntil <= 14 ? "var(--rvo-color-rood-700, #c0392b)" : ev.daysUntil <= 30 ? "var(--rvo-color-oranje-600, #e17000)" : "var(--rvo-color-grijs-600)" }}>
                  {formatDate(ev.date)}
                  <span style={{ marginLeft: "0.375rem", fontSize: "0.75rem" }}>
                    ({ev.daysUntil === 0 ? "vandaag" : ev.daysUntil === 1 ? "morgen" : `${ev.daysUntil}d`})
                  </span>
                </span>
                <span style={{ color: "var(--rvo-color-grijs-700)" }}>{ev.label}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "start" }}>
        {/* Quick actions */}
        <LinkListCard headingLevel={2} heading="Snel toevoegen">
          <LinkList>
            {quickLinks.map(({ href, label }) => (
              <LinkListLink key={href} href={href}>{label}</LinkListLink>
            ))}
          </LinkList>
        </LinkListCard>

        {/* Financiering overzicht */}
        <Card
          heading="Financieringsoverzicht"
          headingLevel={2}
          style={{ maxInlineSize: "none", width: "100%" }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            {[
              { label: "Vrijgegeven budget", value: formatCurrency(stats.releasedBudget), color: "var(--rvo-color-groen-700)" },
              { label: "Concept budget",     value: formatCurrency(stats.conceptBudget),  color: "var(--rvo-color-oranje-600, #e17000)" },
              { label: "Totaal",             value: formatCurrency(stats.releasedBudget + stats.conceptBudget), color: "inherit" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: "0.875rem", color: "var(--rvo-color-grijs-700)" }}>{label}</span>
                <strong style={{ color }}>{value}</strong>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "1rem" }}>
            <Link href="/financiering" className="utrecht-link" style={{ fontSize: "0.875rem" }}>Naar financieringsoverzicht</Link>
          </div>
        </Card>
      </div>

      {/* Recent activity */}
      {recentActivity.length > 0 && (
        <div style={{ marginTop: "2.5rem" }}>
          <Heading level={2} style={{ marginBottom: "1rem" }}>Recente activiteit</Heading>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {recentActivity.map((ev) => (
              <div key={ev.id} style={{ display: "flex", gap: "1rem", alignItems: "baseline", padding: "0.625rem 0", borderBottom: "1px solid var(--rvo-color-grijs-100, #f1f1f1)", fontSize: "0.875rem" }}>
                <span style={{ color: "var(--rvo-color-grijs-500)", whiteSpace: "nowrap", flexShrink: 0 }}>
                  {formatDate(ev.createdAt)}
                </span>
                <span>
                  <strong>{actionLabels[ev.action] ?? ev.action}</strong>
                  {" "}
                  <span style={{ color: "var(--rvo-color-grijs-600)" }}>{entityLabels[ev.entityType] ?? ev.entityType}</span>
                  {" door "}
                  <span style={{ color: "var(--rvo-color-grijs-700)" }}>
                    {ev.actorUser?.name ?? ev.actorUser?.email ?? "Systeem"}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
