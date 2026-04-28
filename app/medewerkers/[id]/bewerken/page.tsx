import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { employees, organisations } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { MedewerkerEditForm } from "./EditForm";

export default async function MedewerkerBewerkenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const [emp, allOrgs] = await Promise.all([
    db.query.employees.findFirst({
      where: and(eq(employees.id, id), isNull(employees.deletedAt)),
    }),
    db.select({ id: organisations.id, name: organisations.name })
      .from(organisations)
      .where(isNull(organisations.deletedAt))
      .orderBy(organisations.name),
  ]);

  if (!emp) notFound();

  return <MedewerkerEditForm emp={emp} orgs={allOrgs} />;
}
