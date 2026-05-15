import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";

export const metadata: Metadata = { title: "Positie financieren – Teambeheer" };
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { teams, positions, financialSourceAmounts, financialSources, fundingAllocations, teamPositionCouplings } from "@/lib/db/schema";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { AllocatePositionForm } from "./AllocatePositionForm";
import { getOPFType } from "@/lib/opf-types";

export default async function FinancierPositiePage({ params }: { params: Promise<{ id: string; positionId: string }> }) {
  const { id, positionId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const team = await db.query.teams.findFirst({
    where: and(eq(teams.id, id), isNull(teams.deletedAt)),
    with: { organisation: true },
  });
  if (!team) notFound();

  const position = await db.query.positions.findFirst({
    where: and(eq(positions.id, positionId), isNull(positions.deletedAt)),
    with: {
      fundingAllocations: {
        where: eq(fundingAllocations.status, "active"),
        with: {
          financialSourceAmount: { with: { financialSource: true, type: true } },
          companyPersexBudget: true,
        },
      },
    },
  });
  if (!position) notFound();

  const coupling = await db.query.teamPositionCouplings.findFirst({
    where: and(eq(teamPositionCouplings.positionId, positionId), eq(teamPositionCouplings.teamId, id), isNull(teamPositionCouplings.endDate)),
  });
  if (!coupling) notFound();

  const opfDef = getOPFType(position.opfType);

  // Released financial source amounts
  const allSourceIds = (await db.select({ id: financialSources.id }).from(financialSources).where(isNull(financialSources.deletedAt))).map(s => s.id);
  const availableAmounts = allSourceIds.length > 0
    ? await db.query.financialSourceAmounts.findMany({
        where: and(
          eq(financialSourceAmounts.status, "released"),
          inArray(financialSourceAmounts.financialSourceId, allSourceIds),
        ),
        with: {
          financialSource: { with: { organisation: true } },
          type: true,
          allocations: { where: eq(fundingAllocations.status, "active") },
        },
        orderBy: (a, { asc }) => [asc(a.financialSourceId)],
      })
    : [];

  // All company persex budgets (soft cap — always available regardless of status)
  const persexBudgets = await db.query.companyPersexBudgets.findMany({
    with: { allocations: { where: eq(fundingAllocations.status, "active") } },
    orderBy: (b, { asc }) => [asc(b.year)],
  });

  // Sort source amounts: preferred category first
  const preferredCategory = opfDef?.naturalCategory;
  const sortedAmounts = [...availableAmounts].sort((a, b) => {
    const aMatch = preferredCategory && a.type?.type === preferredCategory ? 0 : 1;
    const bMatch = preferredCategory && b.type?.type === preferredCategory ? 0 : 1;
    return aMatch - bMatch;
  });

  const alreadyAllocated = position.fundingAllocations.reduce(
    (s, a) => s + Number(a.amount ?? 0),
    0,
  );

  return (
    <AllocatePositionForm
      position={position}
      teamId={team.id}
      teamName={team.name}
      availableAmounts={sortedAmounts}
      persexBudgets={persexBudgets.map(b => ({
        id: b.id,
        year: b.year,
        amount: b.amount,
        status: b.status,
        allocated: b.allocations.reduce((s, a) => s + Number(a.amount ?? 0), 0),
      }))}
      alreadyAllocated={alreadyAllocated}
    />
  );
}
