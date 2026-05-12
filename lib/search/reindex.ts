import { db } from "../db";
import { employees, teams, organisations, financialSources, positions, teamPositionCouplings } from "../db/schema";
import { isNull } from "drizzle-orm";
import { getClient, INDEXES, ensureIndexes } from "./client";

function buildFullName(firstName: string, prefixName: string | null, lastName: string): string {
  return [firstName, prefixName, lastName].filter(Boolean).join(" ");
}

export async function reindex() {
  console.log("[reindex] Configuring indexes…");
  await ensureIndexes();

  const c = getClient();
  const tasks: number[] = [];

  // ── Employees ────────────────────────────────────────────────────────────────
  const allEmployees = await db.query.employees.findMany({
    where: isNull(employees.deletedAt),
    with: { organisation: true },
  });
  console.log(`[reindex] ${allEmployees.length} medewerkers`);
  if (allEmployees.length > 0) {
    const t = await c.index(INDEXES.employees).addDocuments(
      allEmployees.map(row => ({
        id: row.id,
        firstName: row.firstName,
        prefixName: row.prefixName ?? null,
        lastName: row.lastName,
        fullName: buildFullName(row.firstName, row.prefixName, row.lastName),
        organisationName: row.organisation.name,
        organisationId: row.organisationId,
        url: `/medewerkers/${row.id}`,
      })),
      { primaryKey: "id" }
    );
    tasks.push(t.taskUid);
  }

  // ── Teams ─────────────────────────────────────────────────────────────────────
  const allTeams = await db.query.teams.findMany({
    where: isNull(teams.deletedAt),
    with: { organisation: true },
  });
  console.log(`[reindex] ${allTeams.length} teams`);
  if (allTeams.length > 0) {
    const t = await c.index(INDEXES.teams).addDocuments(
      allTeams.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description ?? null,
        organisationName: row.organisation.name,
        organisationId: row.organisationId,
        url: `/teams/${row.id}`,
      })),
      { primaryKey: "id" }
    );
    tasks.push(t.taskUid);
  }

  // ── Organisations ─────────────────────────────────────────────────────────────
  const allOrgs = await db.select().from(organisations).where(isNull(organisations.deletedAt));
  console.log(`[reindex] ${allOrgs.length} organisaties`);
  if (allOrgs.length > 0) {
    const t = await c.index(INDEXES.organisations).addDocuments(
      allOrgs.map(row => ({
        id: row.id,
        name: row.name,
        type: row.type,
        url: `/organisaties/${row.id}`,
      })),
      { primaryKey: "id" }
    );
    tasks.push(t.taskUid);
  }

  // ── Financial sources ─────────────────────────────────────────────────────────
  const allSources = await db.query.financialSources.findMany({
    where: isNull(financialSources.deletedAt),
    with: { organisation: true },
  });
  console.log(`[reindex] ${allSources.length} financieringsbronnen`);
  if (allSources.length > 0) {
    const t = await c.index(INDEXES.financialSources).addDocuments(
      allSources.map(row => ({
        id: row.id,
        name: row.name,
        projectId: row.projectId,
        organisationName: row.organisation.name,
        organisationId: row.organisationId,
        url: `/financiering/${row.id}`,
      })),
      { primaryKey: "id" }
    );
    tasks.push(t.taskUid);
  }

  // ── Positions ─────────────────────────────────────────────────────────────────
  const allPositions = await db.query.positions.findMany({
    where: isNull(positions.deletedAt),
    with: {
      organisation: true,
      teamCouplings: { where: isNull(teamPositionCouplings.endDate), with: { team: true } },
    },
  });
  console.log(`[reindex] ${allPositions.length} posities`);
  if (allPositions.length > 0) {
    const t = await c.index(INDEXES.positions).addDocuments(
      allPositions.map(row => {
        const activeTeam = row.teamCouplings[0]?.team ?? null;
        return {
          id: row.id,
          type: row.type,
          positionCode: row.positionCode ?? null,
          schaal: row.schaal ?? null,
          status: row.status,
          teamName: activeTeam?.name ?? null,
          teamId: activeTeam?.id ?? null,
          organisationName: row.organisation.name,
          url: activeTeam ? `/teams/${activeTeam.id}` : `/posities/${row.id}`,
        };
      }),
      { primaryKey: "id" }
    );
    tasks.push(t.taskUid);
  }

  if (tasks.length > 0) {
    console.log(`[reindex] Waiting for ${tasks.length} indexing task(s) to complete…`);
    await c.tasks.waitForTasks(tasks);
  }

  console.log("[reindex] Klaar.");
}

// Allow direct execution: `node --import tsx lib/search/reindex.ts`
const isMain = process.argv[1]?.endsWith("reindex.ts") || process.argv[1]?.endsWith("reindex.js");
if (isMain) {
  reindex().catch(console.error).finally(() => process.exit(0));
}
