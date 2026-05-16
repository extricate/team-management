import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { organisations } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { OrganisatieEditForm } from "./EditForm";
import { buildEntityMetadata } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const org = await db.query.organisations.findFirst({ where: and(eq(organisations.id, id), isNull(organisations.deletedAt)) });
  return buildEntityMetadata(org ? `${org.name} bewerken` : undefined, "Organisatie bewerken");
}

export default async function OrganisatieBewerkenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const org = await db.query.organisations.findFirst({
    where: and(eq(organisations.id, id), isNull(organisations.deletedAt)),
  });
  if (!org) notFound();

  return <OrganisatieEditForm org={org} />;
}
