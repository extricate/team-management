import Link from "next/link";
import { redirect } from "next/navigation";
import { Heading, Paragraph } from "@rijkshuisstijl-community/components-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { organisations, teams, employees, positions, financialSourceAmounts, auditEvents } from "@/lib/db/schema";
import { isNull, desc } from "drizzle-orm";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";

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

  const [allOrgs, allTeams, allEmployees, allPositions, allAmounts, recentActivity] = await Promise.all([
    db.select({ id: organisations.id }).from(organisations).where(isNull(organisations.deletedAt)),
    db.select({ id: teams.id }).from(teams).where(isNull(teams.deletedAt)),
    db.select({ id: employees.id }).from(employees).where(isNull(employees.deletedAt)),
    db.select({ id: positions.id, status: positions.status }).from(positions).where(isNull(positions.deletedAt)),
    db.select({ amount: financialSourceAmounts.amount, status: financialSourceAmounts.status }).from(financialSourceAmounts),
    db.query.auditEvents.findMany({
      with: { actorUser: true },
      orderBy: [desc(auditEvents.createdAt)],
      limit: 8,
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

  const stats = [
    { label: "Organisaties",    value: allOrgs.length,    href: "/organisaties", color: "var(--rvo-color-hemelblauw-700)" },
    { label: "Teams",           value: allTeams.length,   href: "/teams",        color: "var(--rvo-color-hemelblauw-700)" },
    { label: "Medewerkers",     value: allEmployees.length, href: "/medewerkers", color: "var(--rvo-color-hemelblauw-700)" },
    { label: "Posities bezet",  value: `${filledPositions}/${totalPositions}`, href: null,
      color: filledPositions === totalPositions && totalPositions > 0 ? "var(--rvo-color-groen-700)" : "var(--rvo-color-hemelblauw-700)" },
    { label: "Open posities",   value: openPositions, href: null,
      color: openPositions > 0 ? "var(--rvo-color-oranje-600, #e17000)" : "var(--rvo-color-groen-700)" },
    { label: "Budget vrijgegeven", value: formatCurrency(releasedBudget), href: "/financiering",
      color: "var(--rvo-color-groen-700)" },
  ];

  const quickLinks = [
    { href: "/organisaties/nieuw",  label: "+ Nieuwe organisatie",  section: "/organisaties" },
    { href: "/teams/nieuw",         label: "+ Nieuw team",          section: "/teams" },
    { href: "/medewerkers/nieuw",   label: "+ Nieuwe medewerker",   section: "/medewerkers" },
    { href: "/financiering/nieuw",  label: "+ Nieuwe financieringsbron", section: "/financiering" },
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
          <div
            key={label}
            style={{
              background: "var(--rvo-color-hemelblauw-50, #eef4fb)",
              borderRadius: "4px",
              padding: "1.25rem",
              textAlign: "center",
              border: "1px solid var(--rvo-color-hemelblauw-100, #d3e4f5)",
            }}
          >
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "start" }}>
        {/* Quick actions */}
        <div>
          <Heading level={2} style={{ fontSize: "1.125rem", marginBottom: "1rem" }}>Snel toevoegen</Heading>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {quickLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="utrecht-button utrecht-button--secondary-action"
                style={{ display: "block", textAlign: "center", textDecoration: "none" }}
              >
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
            <Link href="/financiering" className="utrecht-link" style={{ fontSize: "0.875rem" }}>
              Naar financieringsoverzicht →
            </Link>
          </div>
        </div>
      </div>

      {/* Recent activity */}
      {recentActivity.length > 0 && (
        <div style={{ marginTop: "2.5rem" }}>
          <Heading level={2} style={{ fontSize: "1.125rem", marginBottom: "1rem" }}>Recente activiteit</Heading>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {recentActivity.map((ev) => (
              <div
                key={ev.id}
                style={{
                  display: "flex",
                  gap: "1rem",
                  alignItems: "baseline",
                  padding: "0.625rem 0",
                  borderBottom: "1px solid var(--rvo-color-grijs-100, #f1f1f1)",
                  fontSize: "0.875rem",
                }}
              >
                <span style={{ color: "var(--rvo-color-grijs-500)", whiteSpace: "nowrap", flexShrink: 0 }}>
                  {formatDate(ev.createdAt)}
                </span>
                <span>
                  <strong>{actionLabels[ev.action] ?? ev.action}</strong>
                  {" "}
                  <span style={{ color: "var(--rvo-color-grijs-600)" }}>
                    {entityLabels[ev.entityType] ?? ev.entityType}
                  </span>
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
