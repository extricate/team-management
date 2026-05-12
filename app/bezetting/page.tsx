import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Heading } from "@rijkshuisstijl-community/components-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { organisations, teams, employees, positions } from "@/lib/db/schema";
import { isNull, eq, asc, and, inArray, ne } from "drizzle-orm";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { DragDropPositionBuilder } from "@/components/ui/DragDropPositionBuilder";
import { formatFullName } from "@/lib/utils";

export const metadata: Metadata = { title: "Bezetting indelen – Teambeheer" };

export default async function BezettingPage({
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
        <Breadcrumbs crumbs={[{ label: "Bezetting indelen" }]} />
        <Heading level={1}>Bezetting indelen</Heading>
        <p style={{ color: "var(--rvo-color-grijs-600)" }}>Er zijn nog geen organisaties aangemaakt.</p>
      </div>
    );
  }

  const orgTeams = await db.query.teams.findMany({
    where: (t, { and: a }) => a(eq(t.organisationId, selectedOrgId), isNull(t.deletedAt)),
    orderBy: (t, { asc: _asc }) => [_asc(t.name)],
  });

  const teamIds = orgTeams.map(t => t.id);

  const [orgPositions, orgEmployees] = await Promise.all([
    teamIds.length > 0
      ? db
          .select()
          .from(positions)
          .where(and(inArray(positions.teamId, teamIds), isNull(positions.deletedAt), ne(positions.status, "closed")))
          .orderBy(asc(positions.type))
      : Promise.resolve([]),
    db.query.employees.findMany({
      where: (e, { and: a }) => a(eq(e.organisationId, selectedOrgId), isNull(e.deletedAt)),
      with: {
        positionAssignments: { where: (a, { eq: _eq }) => _eq(a.status, "active") },
        memberships: { where: (m, { and: _and, eq: _eq, inArray: _inArray }) => _and(_eq(m.status, "active"), _inArray(m.teamId, teamIds.length > 0 ? teamIds : ["__none__"])) },
      },
      orderBy: (e, { asc: _asc }) => [_asc(e.lastName), _asc(e.firstName)],
    }),
  ]);

  // Load active assignments for the positions we found
  const positionIds = orgPositions.map(p => p.id);
  const activeAssignments = positionIds.length > 0
    ? await db.query.positionAssignments.findMany({
        where: (a, { and: _and, inArray: _inArray, eq: _eq }) =>
          _and(_inArray(a.positionId, positionIds), _eq(a.status, "active")),
        with: { employee: true },
      })
    : [];

  const assignmentByPosition = new Map(activeAssignments.map(a => [a.positionId, a]));

  const dndTeams = orgTeams.map(t => ({ id: t.id, name: t.name }));

  const dndPositions = orgPositions.map(pos => {
    const assignment = assignmentByPosition.get(pos.id) ?? null;
    return {
      id: pos.id,
      type: pos.type,
      teamId: pos.teamId,
      status: pos.status,
      activeAssignmentId: assignment?.id ?? null,
      activeEmployeeId: assignment?.employeeId ?? null,
      activeEmployeeName: assignment ? formatFullName(assignment.employee) : null,
    };
  });

  const dndEmployees = orgEmployees.map(emp => {
    const activeAssignment = emp.positionAssignments[0] ?? null;
    // Only count assignments to positions within this org's teams
    const isInOrg = activeAssignment ? positionIds.includes(activeAssignment.positionId) : false;
    const activeMembership = emp.memberships[0] ?? null;
    return {
      id: emp.id,
      fullName: formatFullName(emp),
      currentAssignmentId: isInOrg ? (activeAssignment?.id ?? null) : null,
      currentPositionId: isInOrg ? (activeAssignment?.positionId ?? null) : null,
      currentTeamMembershipId: activeMembership?.id ?? null,
      currentTeamId: activeMembership?.teamId ?? null,
    };
  });

  return (
    <div>
      <Breadcrumbs crumbs={[{ label: "Bezetting indelen" }]} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <div>
          <Heading level={1} style={{ margin: "0 0 0.25rem" }}>Bezetting indelen</Heading>
          <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--rvo-color-grijs-600)" }}>
            Posities per team — sleep medewerkers om toe te wijzen.
            <a href="/indelen" style={{ marginLeft: "1rem", color: "var(--rvo-color-hemelblauw-700)" }}>→ Teamleden indelen</a>
          </p>
        </div>
      </div>

      {allOrgs.length > 1 && (
        <form method="get" action="/bezetting" style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end", marginBottom: "1.5rem" }}>
          <div>
            <label htmlFor="orgId" style={{ display: "block", fontSize: "0.8125rem", marginBottom: "0.25rem", color: "var(--rvo-color-grijs-700)" }}>Organisatie</label>
            <select id="orgId" name="orgId" className="utrecht-select" defaultValue={selectedOrgId}>
              {allOrgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <button type="submit" className="utrecht-button utrecht-button--secondary-action">Selecteren</button>
        </form>
      )}

      <DragDropPositionBuilder employees={dndEmployees} teams={dndTeams} positions={dndPositions} />
    </div>
  );
}
