import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { teams } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { NewPositionForm } from "./NewPositionForm";

export default async function NieuwePositiePage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const team = await db.query.teams.findFirst({
    where: and(eq(teams.id, params.id), isNull(teams.deletedAt)),
    with: { organisation: true },
  });
  if (!team) notFound();

  return <NewPositionForm teamId={team.id} teamName={team.name} />;
}
