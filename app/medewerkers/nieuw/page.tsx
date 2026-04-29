import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { organisations } from "@/lib/db/schema";
import { isNull } from "drizzle-orm";
import { NieuweMedewerkerForm } from "./NieuweMedewerkerForm";

export const metadata: Metadata = { title: "Nieuwe medewerker – Teambeheer" };

export default async function NieuweMedewerkerPage() {
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const orgs = await db
    .select({ id: organisations.id, name: organisations.name })
    .from(organisations)
    .where(isNull(organisations.deletedAt))
    .orderBy(organisations.name);

  return <NieuweMedewerkerForm orgs={orgs} />;
}
