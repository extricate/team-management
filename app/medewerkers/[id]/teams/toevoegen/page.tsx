import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { employees, teams } from "@/lib/db/schema";
import { eq, isNull, and, asc } from "drizzle-orm";
import { AddTeamForm } from "./AddTeamForm";
import { formatFullName } from "@/lib/utils";

export default async function TeamToevoegenPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const emp = await db.query.employees.findFirst({
    where: and(eq(employees.id, params.id), isNull(employees.deletedAt)),
  });
  if (!emp) notFound();

  const orgTeams = await db
    .select({ id: teams.id, name: teams.name })
    .from(teams)
    .where(and(eq(teams.organisationId, emp.organisationId), isNull(teams.deletedAt)))
    .orderBy(asc(teams.name));

  return (
    <AddTeamForm
      employeeId={emp.id}
      employeeName={formatFullName(emp)}
      teams={orgTeams}
    />
  );
}
