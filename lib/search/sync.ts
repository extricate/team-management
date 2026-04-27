import { db } from "@/lib/db";
import { employees, teams, organisations, financialSources, positions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getClient, INDEXES, ensureIndexes } from "./client";

function buildFullName(firstName: string, prefixName: string | null, lastName: string): string {
  return [firstName, prefixName, lastName].filter(Boolean).join(" ");
}

export async function syncEmployee(id: string): Promise<void> {
  const row = await db.query.employees.findFirst({
    where: eq(employees.id, id),
    with: { organisation: true },
  });
  if (!row || row.deletedAt) {
    await removeFromIndex(INDEXES.employees, id);
    return;
  }
  await ensureIndexes();
  await getClient().index(INDEXES.employees).addDocuments([{
    id: row.id,
    firstName: row.firstName,
    prefixName: row.prefixName ?? null,
    lastName: row.lastName,
    fullName: buildFullName(row.firstName, row.prefixName, row.lastName),
    organisationName: row.organisation.name,
    organisationId: row.organisationId,
    url: `/medewerkers/${row.id}`,
  }], { primaryKey: "id" });
}

export async function syncTeam(id: string): Promise<void> {
  const row = await db.query.teams.findFirst({
    where: eq(teams.id, id),
    with: { organisation: true },
  });
  if (!row || row.deletedAt) {
    await removeFromIndex(INDEXES.teams, id);
    return;
  }
  await ensureIndexes();
  await getClient().index(INDEXES.teams).addDocuments([{
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    organisationName: row.organisation.name,
    organisationId: row.organisationId,
    url: `/teams/${row.id}`,
  }], { primaryKey: "id" });
}

export async function syncOrganisation(id: string): Promise<void> {
  const [row] = await db.select().from(organisations).where(eq(organisations.id, id));
  if (!row || row.deletedAt) {
    await removeFromIndex(INDEXES.organisations, id);
    return;
  }
  await ensureIndexes();
  await getClient().index(INDEXES.organisations).addDocuments([{
    id: row.id,
    name: row.name,
    type: row.type,
    url: `/organisaties/${row.id}`,
  }], { primaryKey: "id" });
}

export async function syncFinancialSource(id: string): Promise<void> {
  const row = await db.query.financialSources.findFirst({
    where: eq(financialSources.id, id),
    with: { organisation: true },
  });
  if (!row || row.deletedAt) {
    await removeFromIndex(INDEXES.financialSources, id);
    return;
  }
  await ensureIndexes();
  await getClient().index(INDEXES.financialSources).addDocuments([{
    id: row.id,
    name: row.name,
    projectId: row.projectId,
    organisationName: row.organisation.name,
    organisationId: row.organisationId,
    url: `/financiering/${row.id}`,
  }], { primaryKey: "id" });
}

export async function syncPosition(id: string): Promise<void> {
  const row = await db.query.positions.findFirst({
    where: eq(positions.id, id),
    with: { team: { with: { organisation: true } } },
  });
  if (!row || row.deletedAt) {
    await removeFromIndex(INDEXES.positions, id);
    return;
  }
  await ensureIndexes();
  await getClient().index(INDEXES.positions).addDocuments([{
    id: row.id,
    type: row.type,
    positionCode: row.positionCode ?? null,
    schaal: row.schaal ?? null,
    status: row.status,
    teamName: row.team.name,
    teamId: row.teamId,
    organisationName: row.team.organisation.name,
    url: `/teams/${row.teamId}`,
  }], { primaryKey: "id" });
}

export async function removeFromIndex(indexName: string, id: string): Promise<void> {
  try {
    await getClient().index(indexName).deleteDocument(id);
  } catch {
    // Document may not exist; ignore
  }
}
