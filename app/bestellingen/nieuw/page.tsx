import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { organisations, bestellingTypes } from "@/lib/db/schema";
import { isNull } from "drizzle-orm";
import { NieuweBestellingForm } from "./NieuweBestellingForm";

export const metadata: Metadata = { title: "Nieuwe bestelling – Teambeheer" };

export default async function NieuweBestellingPage() {
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const [orgs, types] = await Promise.all([
    db.select({ id: organisations.id, name: organisations.name }).from(organisations).where(isNull(organisations.deletedAt)).orderBy(organisations.name),
    db.select({ id: bestellingTypes.id, naam: bestellingTypes.naam }).from(bestellingTypes).orderBy(bestellingTypes.naam),
  ]);

  return <NieuweBestellingForm orgs={orgs} types={types} />;
}
