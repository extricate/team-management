import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { teams, positions } from "@/lib/db/schema";
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
  if (!position || position.teamId !== id) notFound();

  return <EditPositionForm position={position} teamId={team.id} teamName={team.name} />;
}
