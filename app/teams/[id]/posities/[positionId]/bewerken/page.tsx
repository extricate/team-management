import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";

export const metadata: Metadata = { title: "Positie bewerken – Teambeheer" };
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { teams, positions, teamPositionCouplings } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { EditPositionForm } from "./EditPositionForm";

export default async function EditPositiePage({ params }: { params: Promise<{ id: string; positionId: string }> }) {
  const { id, positionId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const team = await db.query.teams.findFirst({
    where: and(eq(teams.id, id), isNull(teams.deletedAt)),
  });
  if (!team) notFound();

  const position = await db.query.positions.findFirst({
    where: and(eq(positions.id, positionId), isNull(positions.deletedAt)),
  });
  if (!position) notFound();

  const coupling = await db.query.teamPositionCouplings.findFirst({
    where: and(eq(teamPositionCouplings.positionId, positionId), eq(teamPositionCouplings.teamId, id), isNull(teamPositionCouplings.endDate)),
  });
  if (!coupling) notFound();

  return <EditPositionForm position={position} teamId={team.id} teamName={team.name} />;
}
