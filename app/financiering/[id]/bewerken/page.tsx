import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { financialSources } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { FinancieringEditForm } from "./EditForm";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const source = await db.query.financialSources.findFirst({ where: and(eq(financialSources.id, id), isNull(financialSources.deletedAt)) });
  return { title: source ? `${source.name} bewerken – Teambeheer` : "Financieringsbron bewerken – Teambeheer" };
}

export default async function FinancieringBewerkenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const source = await db.query.financialSources.findFirst({
    where: and(eq(financialSources.id, id), isNull(financialSources.deletedAt)),
    with: { organisation: true },
  });
  if (!source) notFound();

  return <FinancieringEditForm source={source} />;
}
