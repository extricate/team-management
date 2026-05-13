import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { organisations } from "@/lib/db/schema";
import { isNull, asc } from "drizzle-orm";
import { BulkTeamsForm } from "./BulkTeamsForm";

export const metadata: Metadata = { title: "Teams snel toevoegen – Teambeheer" };

export default async function BulkTeamsPage() {
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const orgs = await db
    .select({ id: organisations.id, name: organisations.name })
    .from(organisations)
    .where(isNull(organisations.deletedAt))
    .orderBy(asc(organisations.name));

  return <BulkTeamsForm orgs={orgs} defaultOrganisationId={session.user.defaultOrganisationId ?? null} />;
}
