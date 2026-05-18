import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { positions, functies } from "@/lib/db/schema";
import { eq, isNull, and, asc } from "drizzle-orm";
import { EditPositieForm } from "./EditPositieForm";
import { isSentinel } from "@/lib/functies";

export const metadata: Metadata = { title: "Positie bewerken – Teambeheer" };

export default async function BewerkenPositiePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const [position, allFuncties] = await Promise.all([
    db.query.positions.findFirst({
      where: and(eq(positions.id, id), isNull(positions.deletedAt)),
    }),
    db
      .select({ id: functies.id, titel: functies.titel, schaalCode: functies.schaalCode, isActive: functies.isActive })
      .from(functies)
      .where(isNull(functies.deletedAt))
      .orderBy(asc(functies.titel)),
  ]);

  if (!position) notFound();

  // Include inactive functies in edit form so existing positions still show their functie
  // Derive a display name for breadcrumbs: prefer roltitel or functie titel or legacy type
  const currentFunctie = allFuncties.find(f => f.id === position.functieId);
  const positieNaam =
    (isSentinel(currentFunctie) ? position.roltitel : currentFunctie?.titel) ??
    position.type ??
    "Positie";

  return <EditPositieForm position={position} functies={allFuncties} positieNaam={positieNaam} />;
}
