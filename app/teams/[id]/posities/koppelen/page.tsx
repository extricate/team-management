import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { teams, positions, teamPositionCouplings } from "@/lib/db/schema";
import { eq, isNull, and, ne } from "drizzle-orm";
import { KoppelenPositieForm } from "./KoppelenPositieForm";

export const metadata: Metadata = { title: "Positie koppelen – Teambeheer" };

export default async function KoppelenPositiePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const team = await db.query.teams.findFirst({
    where: and(eq(teams.id, id), isNull(teams.deletedAt)),
    with: { organisation: true },
  });
  if (!team) notFound();

  // Load all non-deleted, non-closed positions from the same org
  const orgPositions = await db.query.positions.findMany({
    where: and(
      eq(positions.organisationId, team.organisationId),
      isNull(positions.deletedAt),
      ne(positions.status, "gesloten"),
    ),
    with: {
      teamCouplings: {
        where: isNull(teamPositionCouplings.endDate),
      },
    },
    orderBy: (p, { asc }) => [asc(p.type)],
  });

  // Only show positions that have no active coupling
  const availablePositions = orgPositions.filter(p => p.teamCouplings.length === 0);

  return (
    <KoppelenPositieForm
      teamId={team.id}
      teamName={team.name}
      orgId={team.organisationId}
      availablePositions={availablePositions.map(p => ({
        id: p.id,
        type: p.type,
        opfType: p.opfType,
        positionCode: p.positionCode,
        schaal: p.schaal,
        status: p.status,
        teamCouplings: p.teamCouplings.map(c => ({ endDate: c.endDate ? c.endDate.toISOString() : null })),
      }))}
    />
  );
}
