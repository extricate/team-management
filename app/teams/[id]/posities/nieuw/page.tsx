import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";

export const metadata: Metadata = { title: "Nieuwe positie – Teambeheer" };
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { teams, functies } from "@/lib/db/schema";
import { eq, isNull, and, asc } from "drizzle-orm";
import { NewPositionForm } from "./NewPositionForm";

export default async function NieuwePositiePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const [team, allFuncties] = await Promise.all([
    db.query.teams.findFirst({
      where: and(eq(teams.id, id), isNull(teams.deletedAt)),
      with: { organisation: true },
    }),
    db
      .select({ id: functies.id, titel: functies.titel, schaalCode: functies.schaalCode })
      .from(functies)
      .where(and(eq(functies.isActive, true), isNull(functies.deletedAt)))
      .orderBy(asc(functies.titel)),
  ]);

  if (!team) notFound();

  return (
    <NewPositionForm
      teamId={team.id}
      organisationId={team.organisationId}
      teamName={team.name}
      functies={allFuncties}
    />
  );
}
