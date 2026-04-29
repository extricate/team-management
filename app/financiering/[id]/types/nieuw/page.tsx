import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";

export const metadata: Metadata = { title: "Nieuw financieringstype – Teambeheer" };
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { financialSources } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { NewTypeForm } from "./NewTypeForm";

export default async function NieuwTypePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const source = await db.query.financialSources.findFirst({
    where: and(eq(financialSources.id, id), isNull(financialSources.deletedAt)),
    with: { types: true },
  });
  if (!source) notFound();

  return (
    <NewTypeForm
      sourceId={source.id}
      sourceName={source.name}
      existingTypes={source.types}
    />
  );
}
