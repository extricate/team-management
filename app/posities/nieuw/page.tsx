import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { organisations, functies } from "@/lib/db/schema";
import { isNull, asc, and, eq } from "drizzle-orm";
import { NieuwePositieForm } from "./NieuwePositieForm";

export const metadata: Metadata = { title: "Nieuwe positie – Teambeheer" };

export default async function NieuwePositiePage() {
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const [allOrgs, allFuncties] = await Promise.all([
    db
      .select({ id: organisations.id, name: organisations.name })
      .from(organisations)
      .where(isNull(organisations.deletedAt))
      .orderBy(asc(organisations.name)),
    db
      .select({ id: functies.id, titel: functies.titel, schaalCode: functies.schaalCode, isActive: functies.isActive })
      .from(functies)
      .where(and(eq(functies.isActive, true), isNull(functies.deletedAt)))
      .orderBy(asc(functies.titel)),
  ]);

  return (
    <NieuwePositieForm
      organisations={allOrgs}
      functies={allFuncties}
      defaultOrganisationId={session.user.defaultOrganisationId ?? undefined}
    />
  );
}
