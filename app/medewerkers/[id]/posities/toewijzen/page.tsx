import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";

export const metadata: Metadata = { title: "Positie toewijzen – Teambeheer" };
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { employees, positions, teamPositionCouplings } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { AssignPositieForm } from "./AssignPositieForm";
import { formatFullName } from "@/lib/utils";
import { getPositionTitel } from "@/lib/functies";

export default async function PositieToewijzenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const emp = await db.query.employees.findFirst({
    where: and(eq(employees.id, id), isNull(employees.deletedAt)),
  });
  if (!emp) notFound();

  // Only show open positions within the employee's own organisation, coupled to a team.
  const openPositions = await db.query.positions.findMany({
    where: and(
      isNull(positions.deletedAt),
      eq(positions.status, "open"),
      eq(positions.organisationId, emp.organisationId),
    ),
    with: {
      functie: { columns: { titel: true } },
      teamCouplings: {
        where: isNull(teamPositionCouplings.endDate),
        with: { team: true },
      },
    },
    orderBy: (p, { asc }) => [asc(p.type)],
  });

  return (
    <AssignPositieForm
      employeeId={emp.id}
      employeeName={formatFullName(emp)}
      positions={openPositions.map(p => ({
        id: p.id,
        type: getPositionTitel(p),
        positionCode: p.positionCode,
        teamCouplings: p.teamCouplings.map(c => ({ team: { id: c.team.id, name: c.team.name } })),
      }))}
    />
  );
}
