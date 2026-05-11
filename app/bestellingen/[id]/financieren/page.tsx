import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { bestellingen, financialSourceAmounts, financialSources, fundingAllocations } from "@/lib/db/schema";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { AllocateBestellingForm } from "./AllocateBestellingForm";

export const metadata: Metadata = { title: "Bestelling financieren – Teambeheer" };

export default async function FinancierBestellingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const bestelling = await db.query.bestellingen.findFirst({
    where: and(eq(bestellingen.id, id), isNull(bestellingen.deletedAt)),
    with: {
      type: true,
      fundingAllocations: {
        where: eq(fundingAllocations.status, "active"),
        with: { financialSourceAmount: { with: { financialSource: true, financialType: true } } },
      },
    },
  });
  if (!bestelling) notFound();

  const allSourceIds = (await db.select({ id: financialSources.id }).from(financialSources).where(isNull(financialSources.deletedAt))).map(s => s.id);

  const availableAmounts = allSourceIds.length > 0
    ? await db.query.financialSourceAmounts.findMany({
        where: and(
          eq(financialSourceAmounts.status, "released"),
          inArray(financialSourceAmounts.financialSourceId, allSourceIds),
        ),
        with: {
          financialSource: { with: { organisation: true } },
          financialType: true,
          allocations: { where: eq(fundingAllocations.status, "active") },
        },
        orderBy: (a, { asc }) => [asc(a.financialSourceId)],
      })
    : [];

  // Only MATEX and Investeringen are valid for bestellingen
  const validAmounts = availableAmounts.filter(a =>
    a.financialType?.type === "MATEX" || a.financialType?.type === "Investeringen"
  );

  const alreadyAllocated = bestelling.fundingAllocations.reduce(
    (s, a) => s + Number(a.amount ?? 0),
    0,
  );

  return (
    <AllocateBestellingForm
      bestelling={bestelling}
      availableAmounts={validAmounts}
      alreadyAllocated={alreadyAllocated}
    />
  );
}
