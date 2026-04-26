import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { teams, positions } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { EditPositionForm } from "./EditPositionForm";

export default async function EditPositiePage({ params }: { params: { id: string; positionId: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const team = await db.query.teams.findFirst({
    where: and(eq(teams.id, params.id), isNull(teams.deletedAt)),
  });
  if (!team) notFound();

  const position = await db.query.positions.findFirst({
    where: and(eq(positions.id, params.positionId), isNull(positions.deletedAt)),
  });
  if (!position || position.teamId !== params.id) notFound();

  return <EditPositionForm position={position} teamId={team.id} teamName={team.name} />;
}
