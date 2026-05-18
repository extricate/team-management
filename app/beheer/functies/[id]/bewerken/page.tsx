import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { functies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isSentinel } from "@/lib/functies";
import { EditFunctieForm } from "./EditFunctieForm";

export const metadata = { title: "Functie bewerken – Teambeheer" };

export default async function BewerkenFunctiePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/inloggen");
  if (session.user.role !== "admin") redirect("/dashboard");

  const { id } = await params;
  const [functie] = await db.select().from(functies).where(eq(functies.id, id));
  if (!functie || functie.deletedAt) notFound();
  if (isSentinel(functie)) redirect("/beheer/functies");

  return <EditFunctieForm functie={functie} />;
}
