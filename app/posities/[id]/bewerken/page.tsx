import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { positions } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { EditPositieForm } from "./EditPositieForm";

export const metadata: Metadata = { title: "Positie bewerken – Teambeheer" };

export default async function BewerkenPositiePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const position = await db.query.positions.findFirst({
    where: and(eq(positions.id, id), isNull(positions.deletedAt)),
  });
  if (!position) notFound();

  return <EditPositieForm position={position} />;
}
