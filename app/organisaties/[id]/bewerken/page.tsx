import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { organisations } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { OrganisatieEditForm } from "./EditForm";

export default async function OrganisatieBewerkenPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const org = await db.query.organisations.findFirst({
    where: and(eq(organisations.id, params.id), isNull(organisations.deletedAt)),
  });
  if (!org) notFound();

  return <OrganisatieEditForm org={org} />;
}
