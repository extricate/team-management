import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { teamMemberships, teams } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { formatFullName } from "@/lib/utils";
import { EditMembershipForm } from "./EditMembershipForm";

export default async function EditLidPage({ params }: { params: { id: string; membershipId: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const team = await db.query.teams.findFirst({
    where: and(eq(teams.id, params.id), isNull(teams.deletedAt)),
  });
  if (!team) notFound();

  const membership = await db.query.teamMemberships.findFirst({
    where: eq(teamMemberships.id, params.membershipId),
    with: { employee: true },
  });
  if (!membership || membership.teamId !== params.id) notFound();

  return (
    <EditMembershipForm
      membership={membership}
      teamId={team.id}
      teamName={team.name}
      employeeName={formatFullName(membership.employee)}
      employeeId={membership.employeeId}
    />
  );
}
