import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { teams, employees } from "@/lib/db/schema";
import { eq, isNull, and, asc } from "drizzle-orm";
import { AddLidForm } from "./AddLidForm";

export default async function LidToevoegenPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const team = await db.query.teams.findFirst({
    where: and(eq(teams.id, params.id), isNull(teams.deletedAt)),
    with: { organisation: true },
  });
  if (!team) notFound();

  const teamEmployees = await db
    .select({
      id: employees.id,
      firstName: employees.firstName,
      prefixName: employees.prefixName,
      lastName: employees.lastName,
    })
    .from(employees)
    .where(and(eq(employees.organisationId, team.organisationId), isNull(employees.deletedAt)))
    .orderBy(asc(employees.lastName), asc(employees.firstName));

  return (
    <AddLidForm
      teamId={team.id}
      teamName={team.name}
      employees={teamEmployees}
    />
  );
}
