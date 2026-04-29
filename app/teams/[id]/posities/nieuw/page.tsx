import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";

export const metadata: Metadata = { title: "Nieuwe positie – Teambeheer" };
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { teams } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { NewPositionForm } from "./NewPositionForm";

export default async function NieuwePositiePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const team = await db.query.teams.findFirst({
    where: and(eq(teams.id, id), isNull(teams.deletedAt)),
    with: { organisation: true },
  });
  if (!team) notFound();

  return <NewPositionForm teamId={team.id} teamName={team.name} />;
}
