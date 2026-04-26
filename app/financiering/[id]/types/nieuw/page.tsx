import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { financialSources } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { NewTypeForm } from "./NewTypeForm";

export default async function NieuwTypePage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const source = await db.query.financialSources.findFirst({
    where: and(eq(financialSources.id, params.id), isNull(financialSources.deletedAt)),
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
