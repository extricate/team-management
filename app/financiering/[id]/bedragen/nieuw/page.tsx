import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { financialSources } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { NewBedragForm } from "./NewBedragForm";

export default async function NieuwBedragPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const source = await db.query.financialSources.findFirst({
    where: and(eq(financialSources.id, params.id), isNull(financialSources.deletedAt)),
    with: {
      types: { orderBy: (t, { asc }) => [asc(t.year), asc(t.type)] },
    },
  });
  if (!source) notFound();
  if (source.types.length === 0) redirect(`/financiering/${params.id}/types/nieuw`);

  return (
    <NewBedragForm
      sourceId={source.id}
      sourceName={source.name}
      types={source.types}
    />
  );
}
