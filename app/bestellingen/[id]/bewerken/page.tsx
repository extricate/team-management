import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { bestellingen, bestellingTypes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { BewerkenBestellingForm } from "./BewerkenBestellingForm";

export const metadata: Metadata = { title: "Bestelling bewerken – Teambeheer" };

export default async function BewerkenBestellingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const [row, types] = await Promise.all([
    db.query.bestellingen.findFirst({ where: eq(bestellingen.id, id) }),
    db.select({ id: bestellingTypes.id, naam: bestellingTypes.naam }).from(bestellingTypes).orderBy(bestellingTypes.naam),
  ]);

  if (!row || row.deletedAt) notFound();

  return <BewerkenBestellingForm bestelling={row} types={types} />;
}
