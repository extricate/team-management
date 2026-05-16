import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { organisations, teams } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { TeamEditForm } from "./EditForm";
import { buildEntityMetadata } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const team = await db.query.teams.findFirst({ where: and(eq(teams.id, id), isNull(teams.deletedAt)) });
  return buildEntityMetadata(team ? `${team.name} bewerken` : undefined, "Team bewerken");
}

export default async function TeamBewerkenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const [team, allOrgs] = await Promise.all([
    db.query.teams.findFirst({
      where: and(eq(teams.id, id), isNull(teams.deletedAt)),
      with: { organisation: true },
    }),
    db.select({ id: organisations.id, name: organisations.name })
      .from(organisations)
      .where(isNull(organisations.deletedAt))
      .orderBy(organisations.name),
  ]);

  if (!team) notFound();

  return <TeamEditForm team={team} orgs={allOrgs} />;
}
