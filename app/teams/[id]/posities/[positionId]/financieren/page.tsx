import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { teams, positions, financialSourceAmounts, financialSources, fundingAllocations } from "@/lib/db/schema";
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
        with: { financialSourceAmount: { with: { financialSource: true, financialType: true } } },
      },
    },
  });
  if (!position || position.teamId !== id) notFound();

  const opfDef = getOPFType(position.opfType);

  // Released source amounts from the same organisation
  const orgSources = await db
    .select({ id: financialSources.id })
    .from(financialSources)
    .where(and(eq(financialSources.organisationId, team.organisation.id), isNull(financialSources.deletedAt)));

  const sourceIds = orgSources.map(s => s.id);

  const rawAmounts = sourceIds.length > 0
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

  // Sort: preferred-category amounts first, then others
  const preferredCategory = opfDef?.naturalCategory;
  const availableAmounts = [...rawAmounts].sort((a, b) => {
    const aMatch = preferredCategory && a.financialType?.type === preferredCategory ? 0 : 1;
    const bMatch = preferredCategory && b.financialType?.type === preferredCategory ? 0 : 1;
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
      availableAmounts={availableAmounts}
      alreadyAllocated={alreadyAllocated}
    />
  );
}
