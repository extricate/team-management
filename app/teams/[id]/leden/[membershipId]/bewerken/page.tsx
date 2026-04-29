import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";

export const metadata: Metadata = { title: "Lidmaatschap bewerken – Teambeheer" };
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { teamMemberships, teams } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { formatFullName } from "@/lib/utils";
import { EditMembershipForm } from "./EditMembershipForm";

export default async function EditLidPage({ params }: { params: Promise<{ id: string; membershipId: string }> }) {
  const { id, membershipId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const team = await db.query.teams.findFirst({
    where: and(eq(teams.id, id), isNull(teams.deletedAt)),
  });
  if (!team) notFound();

  const membership = await db.query.teamMemberships.findFirst({
    where: eq(teamMemberships.id, membershipId),
    with: { employee: true },
  });
  if (!membership || membership.teamId !== id) notFound();

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
