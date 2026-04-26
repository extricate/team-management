import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { teams, positions, financialSourceAmounts, financialSources, financialTypes, fundingAllocations } from "@/lib/db/schema";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { AllocatePositionForm } from "./AllocatePositionForm";
import { formatCurrency } from "@/lib/utils";

export default async function FinancierPositiePage({ params }: { params: { id: string; positionId: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const team = await db.query.teams.findFirst({
    where: and(eq(teams.id, params.id), isNull(teams.deletedAt)),
    with: { organisation: true },
  });
  if (!team) notFound();

  const position = await db.query.positions.findFirst({
    where: and(eq(positions.id, params.positionId), isNull(positions.deletedAt)),
    with: {
      fundingAllocations: {
        where: eq(fundingAllocations.status, "active"),
        with: { financialSourceAmount: { with: { financialSource: true, financialType: true } } },
      },
    },
  });
  if (!position || position.teamId !== params.id) notFound();

  // Released source amounts from the same organisation
  const orgSources = await db
    .select({ id: financialSources.id })
    .from(financialSources)
    .where(and(eq(financialSources.organisationId, team.organisation.id), isNull(financialSources.deletedAt)));

  const sourceIds = orgSources.map(s => s.id);

  const availableAmounts = sourceIds.length > 0
    ? await db.query.financialSourceAmounts.findMany({
        where: and(
          eq(financialSourceAmounts.status, "released"),
          inArray(financialSourceAmounts.financialSourceId, sourceIds),
        ),
        with: {
          financialSource: true,
          financialType: true,
          allocations: { where: eq(fundingAllocations.status, "active") },
        },
        orderBy: (a, { asc }) => [asc(a.financialSourceId)],
      })
    : [];

  const alreadyAllocated = position.fundingAllocations.reduce(
    (s, a) => s + Number(a.amount ?? 0),
    0,
  );

  return (
    <AllocatePositionForm
      position={position}
      teamId={team.id}
      teamName={team.name}
      availableAmounts={availableAmounts}
      alreadyAllocated={alreadyAllocated}
    />
  );
}
