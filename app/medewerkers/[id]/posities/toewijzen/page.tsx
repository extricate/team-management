import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { employees, positions, teams } from "@/lib/db/schema";
import { eq, isNull, and, inArray, asc } from "drizzle-orm";
import { AssignPositieForm } from "./AssignPositieForm";
import { formatFullName } from "@/lib/utils";

export default async function PositieToewijzenPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const emp = await db.query.employees.findFirst({
    where: and(eq(employees.id, params.id), isNull(employees.deletedAt)),
  });
  if (!emp) notFound();

  // Only show open positions within the employee's own organisation.
  const orgTeams = await db
    .select({ id: teams.id })
    .from(teams)
    .where(and(eq(teams.organisationId, emp.organisationId), isNull(teams.deletedAt)));

  const teamIds = orgTeams.map(t => t.id);

  const openPositions = teamIds.length > 0
    ? await db.query.positions.findMany({
        where: and(
          isNull(positions.deletedAt),
          eq(positions.status, "open"),
          inArray(positions.teamId, teamIds),
        ),
        with: { team: true },
        orderBy: (p, { asc }) => [asc(p.type)],
      })
    : [];

  return (
    <AssignPositieForm
      employeeId={emp.id}
      employeeName={formatFullName(emp)}
      positions={openPositions}
    />
  );
}
