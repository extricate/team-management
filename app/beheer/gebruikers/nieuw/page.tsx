import { redirect } from "next/navigation";
import { Heading } from "@rijkshuisstijl-community/components-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { organisations } from "@/lib/db/schema";
import { isNull } from "drizzle-orm";
import { NieuwGebruikerForm } from "./NieuwGebruikerForm";

export const metadata = { title: "Nieuw account – Teambeheer" };

export default async function NieuwGebruikerPage() {
  const session = await auth();
  if (!session?.user) redirect("/inloggen?callbackUrl=/beheer/gebruikers/nieuw");
  if (session.user.role !== "admin") redirect("/dashboard");

  const allOrgs = await db.select({ id: organisations.id, name: organisations.name })
    .from(organisations)
    .where(isNull(organisations.deletedAt))
    .orderBy(organisations.name);

  return (
    <main style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
      <Heading level={1}>Nieuw beheeraccount</Heading>
      <NieuwGebruikerForm organisations={allOrgs} />
    </main>
  );
}
