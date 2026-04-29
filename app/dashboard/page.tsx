import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Heading, Paragraph } from "@rijkshuisstijl-community/components-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  organisations, teams, employees, positions,
  financialSourceAmounts, auditEvents, teamMemberships, positionAssignments,
} from "@/lib/db/schema";
import { isNull, desc } from "drizzle-orm";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { detectPositionConflicts, collectUpcomingEvents } from "@/lib/dashboard";

export const metadata: Metadata = { title: "Dashboard – Teambeheer" };

const actionLabels: Record<string, string> = {
  create: "Aangemaakt",
  update: "Bijgewerkt",
  archive: "Gearchiveerd",
  assign: "Toegewezen",
  reallocate: "Herverdeeld",
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

  const [
    allOrgs, allTeams, allEmployees, allPositions, allAmounts, recentActivity,
    activeMemberships, activeAssignments,
  ] = await Promise.all([
    db.select({ id: organisations.id }).from(organisations).where(isNull(organisations.deletedAt)),
    db.select({ id: teams.id }).from(teams).where(isNull(teams.deletedAt)),
    db.select({ id: employees.id }).from(employees).where(isNull(employees.deletedAt)),
    db.query.positions.findMany({
      where: isNull(positions.deletedAt),
      with: {
        team: true,
        fundingAllocations: true,
      },
    }),
    db.select({ amount: financialSourceAmounts.amount, status: financialSourceAmounts.status }).from(financialSourceAmounts),
    db.query.auditEvents.findMany({
      with: { actorUser: true },
      orderBy: [desc(auditEvents.createdAt)],
      limit: 8,
    }),
    db.query.teamMemberships.findMany({
      where: isNull(teamMemberships.endDate),
      with: { employee: true, team: true },
    }),
    db.query.positionAssignments.findMany({
      where: isNull(positionAssignments.endDate),
      with: { employee: true, position: { with: { team: true } } },
    }),
  ]);

  const filledPositions = allPositions.filter(p => p.status === "filled").length;
  const openPositions   = allPositions.filter(p => p.status === "open").length;
  const totalPositions  = allPositions.length;

  const releasedBudget = allAmounts
    .filter(a => a.status === "released")
    .reduce((sum, a) => sum + Number(a.amount), 0);
  const conceptBudget = allAmounts
    .filter(a => a.status === "concept")
    .reduce((sum, a) => sum + Number(a.amount), 0);

  const conflicts = detectPositionConflicts(allPositions);
  const lateStartConflicts = conflicts.filter(c => c.type === "late_start");
  const unfundedConflicts  = conflicts.filter(c => c.type === "unfunded");

  const now = new Date();
  const upcomingEvents = collectUpcomingEvents(allPositions, activeMemberships, activeAssignments, now, 0, 90);

  const stats = [
    { label: "Organisaties",    value: allOrgs.length,    href: "/organisaties", color: "var(--rvo-color-hemelblauw-700)" },
    { label: "Teams",           value: allTeams.length,   href: "/teams",        color: "var(--rvo-color-hemelblauw-700)" },
    { label: "Medewerkers",     value: allEmployees.length, href: "/medewerkers", color: "var(--rvo-color-hemelblauw-700)" },
    { label: "Posities bezet",  value: `${filledPositions}/${totalPositions}`, href: null,
      color: filledPositions === totalPositions && totalPositions > 0 ? "var(--rvo-color-groen-700)" : "var(--rvo-color-hemelblauw-700)" },
    { label: "Open posities",   value: openPositions, href: null,
      color: openPositions > 0 ? "var(--rvo-color-oranje-600, #e17000)" : "var(--rvo-color-groen-700)" },
    { label: "Budget vrijgegeven", value: CurrencyDisplay({ value: releasedBudget }), href: "/financiering",
      color: "var(--rvo-color-groen-700)" },
  ];

  const quickLinks = [
    { href: "/organisaties/nieuw",  label: "+ Nieuwe organisatie" },
    { href: "/teams/nieuw",         label: "+ Nieuw team" },
    { href: "/medewerkers/nieuw",   label: "+ Nieuwe medewerker" },
    { href: "/financiering/nieuw",  label: "+ Nieuwe financieringsbron" },
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: "1rem", marginBottom: "2.5rem" }}>
        {stats.map(({ label, value, href, color }) => (
          <div key={label} style={{ background: "var(--rvo-color-hemelblauw-50, #eef4fb)", borderRadius: "4px", padding: "1.25rem", textAlign: "center", border: "1px solid var(--rvo-color-hemelblauw-100, #d3e4f5)" }}>
            {href ? (
              <Link href={href} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                <div style={{ fontSize: "2rem", fontWeight: 700, color, lineHeight: 1.1 }}>{value}</div>
                <div style={{ fontSize: "0.8125rem", color: "var(--rvo-color-grijs-700)", marginTop: "0.375rem" }}>{label}</div>
              </Link>
            ) : (
              <>
                <div style={{ fontSize: "2rem", fontWeight: 700, color, lineHeight: 1.1 }}>{value}</div>
                <div style={{ fontSize: "0.8125rem", color: "var(--rvo-color-grijs-700)", marginTop: "0.375rem" }}>{label}</div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Conflicts */}
      {conflicts.length > 0 && (
        <section style={{ marginBottom: "2.5rem" }}>
          <Heading level={2} style={{ fontSize: "1.125rem", marginBottom: "1rem" }}>
            ⚠️ Conflicten ({conflicts.length})
          </Heading>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {lateStartConflicts.map(c => (
              <div key={`late-${c.positionId}`} style={{ padding: "0.75rem 1rem", background: "var(--rvo-color-rood-50, #fdf2f2)", border: "1px solid var(--rvo-color-rood-200, #f5c2c2)", borderRadius: "4px", fontSize: "0.875rem" }}>
                <strong>Late start:</strong>{" "}
                <Link href={`/teams/${c.teamId}`} className="utrecht-link">{c.teamName}</Link>
                {" — "}<em>{c.positionType}</em>
                {" "}verwacht te starten op{" "}
                <strong>{c.expectedStart ? formatDate(c.expectedStart) : "?"}</strong>
                {", maar vereist vóór "}
                <strong>{c.requiredBefore ? formatDate(c.requiredBefore) : "?"}</strong>.
              </div>
            ))}
            {unfundedConflicts.map(c => (
              <div key={`unfunded-${c.positionId}`} style={{ padding: "0.75rem 1rem", background: "var(--rvo-color-geel-50, #fffae6)", border: "1px solid var(--rvo-color-geel-200, #ffe680)", borderRadius: "4px", fontSize: "0.875rem" }}>
                <strong>Niet gefinancierd:</strong>{" "}
                <Link href={`/teams/${c.teamId}`} className="utrecht-link">{c.teamName}</Link>
                {" — "}<em>{c.positionType}</em>
                {" "}({c.expectedStart ? `start ${formatDate(c.expectedStart)}` : "geen startdatum"}) heeft nog geen actieve financiering.
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Upcoming events */}
      {upcomingEvents.length > 0 && (
        <section style={{ marginBottom: "2.5rem" }}>
          <Heading level={2} style={{ fontSize: "1.125rem", marginBottom: "1rem" }}>
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
        <div>
          <Heading level={2} style={{ fontSize: "1.125rem", marginBottom: "1rem" }}>Snel toevoegen</Heading>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {quickLinks.map(({ href, label }) => (
              <Link key={href} href={href} className="utrecht-button utrecht-button--secondary-action" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
                {label}
              </Link>
            ))}
          </div>
        </div>

        {/* Financiering overzicht */}
        <div style={{ background: "var(--rvo-color-hemelblauw-50, #eef4fb)", borderRadius: "4px", padding: "1.25rem", border: "1px solid var(--rvo-color-hemelblauw-100, #d3e4f5)" }}>
          <Heading level={2} style={{ fontSize: "1.125rem", marginBottom: "1rem" }}>Financieringsoverzicht</Heading>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            {[
              { label: "Vrijgegeven budget", value: formatCurrency(releasedBudget), color: "var(--rvo-color-groen-700)" },
              { label: "Concept budget",     value: formatCurrency(conceptBudget),  color: "var(--rvo-color-oranje-600, #e17000)" },
              { label: "Totaal",             value: formatCurrency(releasedBudget + conceptBudget), color: "var(--rvo-color-hemelblauw-700)" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: "0.875rem", color: "var(--rvo-color-grijs-700)" }}>{label}</span>
                <span style={{ fontWeight: 700, color }}>{value}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "1rem" }}>
            <Link href="/financiering" className="utrecht-link" style={{ fontSize: "0.875rem" }}>Naar financieringsoverzicht →</Link>
          </div>
        </div>
      </div>

      {/* Recent activity */}
      {recentActivity.length > 0 && (
        <div style={{ marginTop: "2.5rem" }}>
          <Heading level={2} style={{ fontSize: "1.125rem", marginBottom: "1rem" }}>Recente activiteit</Heading>
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
