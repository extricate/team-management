import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { organisations } from "@/lib/db/schema";
import { isNull, asc } from "drizzle-orm";
import { NieuwePositieForm } from "./NieuwePositieForm";

export const metadata: Metadata = { title: "Nieuwe positie – Teambeheer" };

export default async function NieuwePositiePage() {
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const allOrgs = await db
    .select({ id: organisations.id, name: organisations.name })
    .from(organisations)
    .where(isNull(organisations.deletedAt))
    .orderBy(asc(organisations.name));

  return (
    <NieuwePositieForm
      organisations={allOrgs}
      defaultOrganisationId={session.user.defaultOrganisationId ?? undefined}
    />
  );
}
