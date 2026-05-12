import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { Heading, Paragraph } from "@rijkshuisstijl-community/components-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { teams, teamPositionCouplings } from "@/lib/db/schema";
import { eq, isNull } from "drizzle-orm";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatFullName, formatDate } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const team = await db.query.teams.findFirst({ where: eq(teams.id, id) });
  return { title: team ? `${team.name} – Overzicht – Teambeheer` : "Teamoverzicht – Teambeheer" };
}

export default async function TeamOverzichtPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const team = await db.query.teams.findFirst({
    where: eq(teams.id, id),
    with: {
      organisation: true,
      positionCouplings: {
        where: isNull(teamPositionCouplings.endDate),
        with: {
          position: { with: { assignments: { with: { employee: true } } } },
        },
      },
      memberships: { with: { employee: true } },
    },
  });

  if (!team) notFound();

  const activeMembers = team.memberships
    .filter(m => m.status === "active" && !m.endDate)
    .sort((a, b) => {
      const nameA = `${a.employee.lastName} ${a.employee.firstName}`;
      const nameB = `${b.employee.lastName} ${b.employee.firstName}`;
      return nameA.localeCompare(nameB, "nl");
    });

  const sortedPositions = team.positionCouplings
    .filter(c => c.position && !c.position.deletedAt)
    .map(c => c.position!)
    .sort((a, b) => a.type.localeCompare(b.type, "nl"));

  const today = formatDate(new Date());

  return (
    <div>
      {/* Print-friendly header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
        <div>
          <nav style={{ fontSize: "0.8125rem", color: "var(--rvo-color-grijs-600)", marginBottom: "0.75rem" }}>
            <Link href="/teams" className="utrecht-link">Teams</Link>
            {" / "}
            <Link href={`/teams/${team.id}`} className="utrecht-link">{team.name}</Link>
            {" / "}
            Overzicht
          </nav>
          <Heading level={1} style={{ margin: "0 0 0.25rem" }}>{team.name}</Heading>
          <Paragraph style={{ margin: 0, color: "var(--rvo-color-grijs-600)" }}>
            {team.organisation.name} · {team.organisation.type}
          </Paragraph>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }} className="no-print">
          <button
            onClick={undefined}
            className="utrecht-button utrecht-button--secondary-action"
            style={{ fontSize: "0.875rem" }}
            // handled by inline onclick below — server component
          >
            Afdrukken
          </button>
          <Link href={`/teams/${team.id}`} className="utrecht-button utrecht-button--secondary-action" style={{ fontSize: "0.875rem" }}>
            ← Terug
          </Link>
        </div>
      </div>

      <p style={{ fontSize: "0.8125rem", color: "var(--rvo-color-grijs-500)", marginBottom: "2rem" }}>
        Gegenereerd op {today}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2.5rem", alignItems: "start" }}>
        {/* Members section */}
        <section>
          <Heading level={2} style={{ borderBottom: "2px solid var(--rvo-color-hemelblauw-300)", paddingBottom: "0.5rem", marginBottom: "1rem" }}>
            Teamleden ({activeMembers.length})
          </Heading>
          {activeMembers.length === 0 ? (
            <Paragraph style={{ color: "var(--rvo-color-grijs-500)" }}>Geen actieve leden.</Paragraph>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--rvo-color-grijs-200)" }}>
                  <th style={{ textAlign: "left", padding: "0.375rem 0.5rem", fontWeight: 600 }}>Naam</th>
                  <th style={{ textAlign: "left", padding: "0.375rem 0.5rem", fontWeight: 600 }}>Positie</th>
                  <th style={{ textAlign: "left", padding: "0.375rem 0.5rem", fontWeight: 600 }}>Lid sinds</th>
                </tr>
              </thead>
              <tbody>
                {activeMembers.map((m) => {
                  const pos = sortedPositions.find(p =>
                    p.assignments.some(a => a.employeeId === m.employeeId && a.status === "active"),
                  );
                  return (
                    <tr key={m.id} style={{ borderBottom: "1px solid var(--rvo-color-grijs-100)" }}>
                      <td style={{ padding: "0.5rem" }}><strong>{formatFullName(m.employee)}</strong></td>
                      <td style={{ padding: "0.5rem", color: pos ? "inherit" : "var(--rvo-color-grijs-500)" }}>
                        {pos ? pos.type : "—"}
                      </td>
                      <td style={{ padding: "0.5rem", whiteSpace: "nowrap", color: "var(--rvo-color-grijs-600)" }}>
                        {formatDate(m.startDate)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        {/* Positions section */}
        <section>
          <Heading level={2} style={{ borderBottom: "2px solid var(--rvo-color-hemelblauw-300)", paddingBottom: "0.5rem", marginBottom: "1rem" }}>
            Posities ({sortedPositions.length})
          </Heading>
          {sortedPositions.length === 0 ? (
            <Paragraph style={{ color: "var(--rvo-color-grijs-500)" }}>Geen posities.</Paragraph>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--rvo-color-grijs-200)" }}>
                  <th style={{ textAlign: "left", padding: "0.375rem 0.5rem", fontWeight: 600 }}>Positie</th>
                  <th style={{ textAlign: "left", padding: "0.375rem 0.5rem", fontWeight: 600 }}>Bezet door</th>
                  <th style={{ textAlign: "left", padding: "0.375rem 0.5rem", fontWeight: 600 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedPositions.map((pos) => {
                  const activeAssignment = pos.assignments.find(a => a.status === "active");
                  return (
                    <tr key={pos.id} style={{ borderBottom: "1px solid var(--rvo-color-grijs-100)" }}>
                      <td style={{ padding: "0.5rem" }}>
                        <strong>{pos.type}</strong>
                        {pos.positionCode && <span style={{ marginLeft: "0.375rem", color: "var(--rvo-color-grijs-500)", fontSize: "0.8125rem" }}>{pos.positionCode}</span>}
                      </td>
                      <td style={{ padding: "0.5rem", color: activeAssignment ? "inherit" : "var(--rvo-color-grijs-500)" }}>
                        {activeAssignment ? formatFullName(activeAssignment.employee) : "Onbezet"}
                      </td>
                      <td style={{ padding: "0.5rem" }}>
                        <StatusBadge
                          label={pos.status}
                          color={pos.status === "gevuld" ? "green" : pos.status === "open" ? "orange" : pos.status === "toegezegd" ? "blue" : "grey"}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      </div>

      {team.description && (
        <section style={{ marginTop: "2.5rem" }}>
          <Heading level={2} style={{ marginBottom: "0.5rem" }}>Over dit team</Heading>
          <Paragraph style={{ color: "var(--rvo-color-grijs-700)" }}>{team.description}</Paragraph>
        </section>
      )}

      {/* Print button script */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.querySelectorAll('.no-print button').forEach(btn => {
              btn.addEventListener('click', () => window.print());
            });
          `,
        }}
      />

      <style>{`
        @media print {
          .no-print { display: none !important; }
          nav { display: none !important; }
          body { font-size: 12pt; }
        }
      `}</style>
    </div>
  );
}
