import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Heading } from "@rijkshuisstijl-community/components-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { organisations, teams, employees } from "@/lib/db/schema";
import { isNull, eq, asc } from "drizzle-orm";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { DragDropTeamBuilder } from "@/components/ui/DragDropTeamBuilder";
import { formatFullName } from "@/lib/utils";

export const metadata: Metadata = { title: "Teamleden indelen – Teambeheer" };

export default async function IndelenPage({
  searchParams,
}: {
  searchParams: Promise<{ orgId?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const { orgId } = await searchParams;

  const allOrgs = await db
    .select({ id: organisations.id, name: organisations.name })
    .from(organisations)
    .where(isNull(organisations.deletedAt))
    .orderBy(asc(organisations.name));

  const selectedOrgId = orgId ?? session.user.defaultOrganisationId ?? allOrgs[0]?.id ?? null;

  if (!selectedOrgId) {
    return (
      <div>
        <Breadcrumbs crumbs={[{ label: "Teamleden indelen" }]} />
        <Heading level={1}>Teamleden indelen</Heading>
        <p style={{ color: "var(--rvo-color-grijs-600)" }}>Er zijn nog geen organisaties aangemaakt.</p>
      </div>
    );
  }

  const [orgTeams, orgEmployees] = await Promise.all([
    db.query.teams.findMany({
      where: (t, { and: _and }) => _and(eq(t.organisationId, selectedOrgId), isNull(t.deletedAt)),
      orderBy: (t, { asc: _asc }) => [_asc(t.name)],
    }),
    db.query.employees.findMany({
      where: (e, { and: _and }) => _and(eq(e.organisationId, selectedOrgId), isNull(e.deletedAt)),
      with: {
        memberships: {
          where: (m, { isNull: _isNull }) => _isNull(m.endDate),
        },
      },
      orderBy: (e, { asc: _asc }) => [_asc(e.lastName), _asc(e.firstName)],
    }),
  ]);

  const dndEmployees = orgEmployees.map(emp => {
    const activeMembership = emp.memberships.find(m => m.status === "active");
    return {
      id: emp.id,
      fullName: formatFullName(emp),
      currentTeamId: activeMembership?.teamId ?? null,
      currentMembershipId: activeMembership?.id ?? null,
    };
  });

  const dndTeams = orgTeams.map(t => ({
    id: t.id,
    name: t.name,
    organisationName: allOrgs.find(o => o.id === selectedOrgId)?.name ?? "",
  }));

  return (
    <div>
      <Breadcrumbs crumbs={[{ label: "Teamleden indelen" }]} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <div>
          <Heading level={1} style={{ margin: "0 0 0.25rem" }}>Teamleden indelen</Heading>
          <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--rvo-color-grijs-600)" }}>
            Medewerkers per team — sleep om te herindelen.
            <a href="/bezetting" style={{ marginLeft: "1rem", color: "var(--rvo-color-hemelblauw-700)" }}>→ Bezetting indelen</a>
          </p>
        </div>
      </div>

      {/* Org selector */}
      {allOrgs.length > 1 && (
        <form method="get" action="/indelen" style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end", marginBottom: "1.5rem" }}>
          <div>
            <label htmlFor="orgId" style={{ display: "block", fontSize: "0.8125rem", marginBottom: "0.25rem", color: "var(--rvo-color-grijs-700)" }}>Organisatie</label>
            <select id="orgId" name="orgId" className="utrecht-select" defaultValue={selectedOrgId}>
              {allOrgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <button type="submit" className="utrecht-button utrecht-button--secondary-action">Selecteren</button>
        </form>
      )}

      <DragDropTeamBuilder employees={dndEmployees} teams={dndTeams} />
    </div>
  );
}
