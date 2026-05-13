import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { salarisschalen } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { EditSalarisSchaalForm } from "./EditSalarisSchaalForm";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [schaal] = await db.select().from(salarisschalen).where(eq(salarisschalen.id, id));
  if (!schaal) return { title: "Niet gevonden – Teambeheer" };
  return { title: `Schaal ${schaal.schaalCode} (${schaal.year}) – Teambeheer` };
}

export default async function EditSalarisSchaalPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/inloggen");
  if (session.user.role !== "admin") redirect("/dashboard");

  const { id } = await params;
  const [schaal] = await db.select().from(salarisschalen).where(eq(salarisschalen.id, id));
  if (!schaal) notFound();

  return <EditSalarisSchaalForm schaal={schaal} />;
}
