/**
 * Demo seeder — populates all models with realistic Dutch test data.
 *
 * Usage:
 *   npm run db:seed:demo           # add demo data (skips if data already exists)
 *   npm run db:seed:demo -- --reset # wipe and reseed from scratch
 */

import { faker } from "@faker-js/faker/locale/nl";
import { db } from "../index";
import {
  organisations, teams, employees, positions,
  teamMemberships, positionAssignments,
  financialSources, financialTypes, financialSourceAmounts, fundingAllocations,
  auditEvents, comments,
} from "../schema";
import type {
  Organisation, Team, Employee,
} from "../schema";
import { reindex } from "../../search/reindex";

// ── Static content ─────────────────────────────────────────────────────────────

const ORG_DEFINITIONS = [
  {
    name: "Dienst Digitalisering",
    type: "OS1" as const,
    teams: [
      { name: "Architectuur & Design",   description: "Verantwoordelijk voor technische architectuur en ontwerpstandaarden." },
      { name: "Softwareontwikkeling",     description: "Ontwikkelt en onderhoudt interne applicaties en platformen." },
      { name: "Data & Analyse",           description: "Verwerking en ontsluiting van organisatiedata voor besluitvorming." },
      { name: "Beheer & Infrastructuur",  description: "Beheert servers, netwerken en cloudinfrastructuur." },
      { name: "Digitale Innovatie",       description: "Onderzoekt nieuwe technologieën en begeleidt digitale transformatie." },
    ],
    financialSources: [
      { name: "Digitaliseringsprogramma 2025",    projectId: "2025-DIG-001" },
      { name: "Operationeel Budget Digitalisering", projectId: "2025-DIG-002" },
    ],
  },
  {
    name: "Bureau Regelgeving",
    type: "OS2" as const,
    teams: [
      { name: "Beleidsvoorbereiding",        description: "Voorbereiding en afstemming van nieuw beleid en regelgeving." },
      { name: "Juridische Zaken",            description: "Juridische advisering en toetsing van wet- en regelgeving." },
      { name: "Handhaving",                  description: "Toezicht op naleving van wet- en regelgeving." },
      { name: "Communicatie & Voorlichting", description: "Interne en externe communicatie over regelgeving." },
      { name: "Bedrijfsvoering",             description: "HR, financiën en facilitaire ondersteuning van het bureau." },
    ],
    financialSources: [
      { name: "Handhavingsbudget 2025",    projectId: "2025-REG-001" },
      { name: "Beleidsondersteuning 2025", projectId: "2025-REG-002" },
    ],
  },
] as const;

// Dutch government function codes (functiegroepen) and matching scales
const POSITION_DEFS = [
  { type: "OPF1",  schaal: "8",  annualCost: 42000 },
  { type: "OPF2",  schaal: "9",  annualCost: 47500 },
  { type: "OPF3",  schaal: "10", annualCost: 53000 },
  { type: "OBF1",  schaal: "11", annualCost: 60000 },
  { type: "OBF2",  schaal: "12", annualCost: 68000 },
  { type: "OBF3",  schaal: "13", annualCost: 78500 },
  { type: "TL-01", schaal: "13", annualCost: 82000 },
  { type: "PL-01", schaal: "12", annualCost: 70000 },
] as const;

// Dutch tussenvoegsels — ~40 % chance of having one
const TUSSENVOEGSELS = [
  null, null, null, null, null, null,
  "van", "de", "van der", "van den", "van de", "den",
];

const FINANCIAL_CATEGORIES = ["PERSEX", "MATEX", "Investeringen"] as const;

// ── Helpers ────────────────────────────────────────────────────────────────────

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  return faker.helpers.shuffle([...arr]).slice(0, n);
}

/** Splits arr into n roughly equal buckets. */
function distribute<T>(arr: T[], buckets: number): T[][] {
  const shuffled = faker.helpers.shuffle([...arr]);
  return Array.from({ length: buckets }, (_, i) =>
    shuffled.filter((_, j) => j % buckets === i),
  );
}

// ── Reset ──────────────────────────────────────────────────────────────────────

async function resetAll() {
  console.log("  Clearing all non-auth data…");
  // Strict dependency order — FK constraints require children before parents
  await db.delete(fundingAllocations);
  await db.delete(financialSourceAmounts);
  await db.delete(financialTypes);
  await db.delete(financialSources);
  await db.delete(positionAssignments);
  await db.delete(positions);
  await db.delete(teamMemberships);
  await db.delete(comments);
  await db.delete(auditEvents);
  await db.delete(employees);
  await db.delete(teams);
  await db.delete(organisations);
  console.log("  ✓ Cleared");
}

// ── Organisations & Teams ──────────────────────────────────────────────────────

async function seedOrganisationsAndTeams() {
  type OrgWithTeams = { org: Organisation; teams: Team[] };
  const result: OrgWithTeams[] = [];

  for (const def of ORG_DEFINITIONS) {
    const [org] = await db.insert(organisations).values({
      name: def.name,
      type: def.type,
    }).returning();

    const orgTeams: Team[] = [];
    for (const t of def.teams) {
      const [team] = await db.insert(teams).values({
        organisationId: org.id,
        name: t.name,
        description: t.description,
      }).returning();
      orgTeams.push(team);
    }

    result.push({ org, teams: orgTeams });
  }

  return result;
}

// ── Employees ─────────────────────────────────────────────────────────────────

async function seedEmployees(orgsWithTeams: { org: Organisation }[]) {
  type EmployeeWithOrg = { emp: Employee; orgId: string };
  const result: EmployeeWithOrg[] = [];

  for (const { org } of orgsWithTeams) {
    // Build all rows first so we can batch-insert
    const rows = Array.from({ length: 25 }, () => ({
      organisationId: org.id,
      firstName:  faker.person.firstName(),
      lastName:   faker.person.lastName(),
      prefixName: pick(TUSSENVOEGSELS),
    }));

    const created = await db.insert(employees).values(rows).returning();
    result.push(...created.map(emp => ({ emp, orgId: org.id })));
  }

  return result;
}

// ── Positions ─────────────────────────────────────────────────────────────────

async function seedPositions(orgsWithTeams: { teams: Team[] }[]) {
  type PositionWithTeam = { pos: typeof positions.$inferSelect; teamId: string };
  const result: PositionWithTeam[] = [];

  const statusWeights = ["filled", "filled", "filled", "open", "open", "planned", "closed"] as const;

  for (const { teams: orgTeams } of orgsWithTeams) {
    for (const team of orgTeams) {
      // 3 positions per team, distinct types
      const defs = faker.helpers.shuffle([...POSITION_DEFS]).slice(0, 3);

      const rows = defs.map((def, i) => ({
        teamId:       team.id,
        type:         def.type,
        positionCode: `${team.id.slice(0, 6).toUpperCase()}-${def.type}-${i + 1}`,
        schaal:       def.schaal,
        annualCost:   String(def.annualCost),
        status:       pick(statusWeights),
        expectedStart: faker.date.between({ from: "2024-01-01", to: "2025-06-01" }),
      }));

      const created = await db.insert(positions).values(rows).returning();
      result.push(...created.map(pos => ({ pos, teamId: team.id })));
    }
  }

  return result;
}

// ── Team Memberships ───────────────────────────────────────────────────────────

async function seedTeamMemberships(
  orgsWithTeams: { org: Organisation; teams: Team[] }[],
  allEmployees:  { emp: Employee; orgId: string }[],
) {
  type MembershipRecord = { teamId: string; empId: string };
  const created: MembershipRecord[] = [];

  for (const { org, teams: orgTeams } of orgsWithTeams) {
    const orgEmps = allEmployees.filter(e => e.orgId === org.id).map(e => e.emp);

    // Distribute employees evenly across the org's teams (primary membership)
    const buckets = distribute(orgEmps, orgTeams.length);

    const primaryRows = buckets.flatMap((bucket, i) =>
      bucket.map(emp => ({
        teamId:    orgTeams[i].id,
        employeeId: emp.id,
        startDate: faker.date.between({ from: "2023-01-01", to: "2024-06-01" }),
        status:    "active" as const,
      }))
    );

    if (primaryRows.length > 0) {
      await db.insert(teamMemberships).values(primaryRows);
      created.push(...primaryRows.map(r => ({ teamId: r.teamId, empId: r.employeeId })));
    }

    // ~20 % of employees get a secondary team within the same org
    const secondaryCandidates = pickN(orgEmps, Math.floor(orgEmps.length * 0.2));
    for (const emp of secondaryCandidates) {
      const alreadyIn = new Set(created.filter(m => m.empId === emp.id).map(m => m.teamId));
      const eligible  = orgTeams.filter(t => !alreadyIn.has(t.id));
      if (eligible.length === 0) continue;

      const team = pick(eligible);
      await db.insert(teamMemberships).values({
        teamId:     team.id,
        employeeId: emp.id,
        startDate:  faker.date.between({ from: "2024-01-01", to: "2025-01-01" }),
        status:     "active",
      });
      created.push({ teamId: team.id, empId: emp.id });
    }
  }

  return created;
}

// ── Position Assignments ───────────────────────────────────────────────────────

async function seedPositionAssignments(
  allPositions:  { pos: typeof positions.$inferSelect; teamId: string }[],
  allMemberships: { teamId: string; empId: string }[],
) {
  const filledPositions = allPositions.filter(p => p.pos.status === "filled");

  for (const { pos, teamId } of filledPositions) {
    const eligibleEmpIds = allMemberships
      .filter(m => m.teamId === teamId)
      .map(m => m.empId);

    if (eligibleEmpIds.length === 0) continue;

    await db.insert(positionAssignments).values({
      positionId: pos.id,
      employeeId: pick(eligibleEmpIds),
      startDate:  faker.date.between({ from: "2024-01-01", to: "2025-01-01" }),
      status:     "active",
    });
  }

  return filledPositions.length;
}

// ── Financial Data ─────────────────────────────────────────────────────────────

async function seedFinancialData(orgsWithTeams: { org: Organisation; teams: Team[] }[]) {
  const year = new Date().getFullYear();

  for (const { org, teams: orgTeams } of orgsWithTeams) {
    const orgDef = ORG_DEFINITIONS.find(d => d.name === org.name)!;

    for (const srcDef of orgDef.financialSources) {
      const [source] = await db.insert(financialSources).values({
        organisationId: org.id,
        name:      srcDef.name,
        projectId: srcDef.projectId,
      }).returning();

      for (const category of FINANCIAL_CATEGORIES) {
        const [ft] = await db.insert(financialTypes).values({
          financialSourceId: source.id,
          type: category,
          year,
        }).returning();

        const baseAmount =
          category === "PERSEX"      ? faker.number.int({ min: 500_000,  max: 2_500_000 }) :
          category === "MATEX"       ? faker.number.int({ min: 100_000,  max:   600_000 }) :
          /* Investeringen */           faker.number.int({ min: 200_000,  max: 1_500_000 });

        const isReleased = faker.datatype.boolean({ probability: 0.6 });

        const [amount] = await db.insert(financialSourceAmounts).values({
          financialSourceId: source.id,
          financialTypeId:   ft.id,
          amount:            String(baseAmount),
          status:            isReleased ? "released" : "concept",
          effectiveDate:     new Date(`${year}-01-01`),
          releaseDate:       isReleased ? new Date(`${year}-03-01`) : undefined,
        }).returning();

        // Allocate released PERSEX budgets across 1–2 teams
        if (category === "PERSEX" && isReleased) {
          const teamsToFund = pickN(orgTeams, faker.number.int({ min: 1, max: 2 }));
          const perTeam = Math.floor(baseAmount / teamsToFund.length);

          const allocationRows = teamsToFund.map(team => ({
            financialSourceAmountId: amount.id,
            teamId:    team.id,
            amount:    String(perTeam),
            startDate: new Date(`${year}-01-01`),
            status:    "active" as const,
          }));

          if (allocationRows.length > 0) {
            await db.insert(fundingAllocations).values(allocationRows);
          }
        }
      }
    }
  }
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  const shouldReset = process.argv.includes("--reset");

  // Guard: skip if data already present (unless --reset)
  const [existing] = await db.select().from(organisations).limit(1);
  if (existing && !shouldReset) {
    console.log("⚠  Demo data already present. Run with --reset to wipe and reseed.");
    return;
  }

  if (shouldReset) await resetAll();

  console.log("Seeding organisations & teams…");
  const orgsWithTeams = await seedOrganisationsAndTeams();
  const totalTeams = orgsWithTeams.reduce((n, o) => n + o.teams.length, 0);
  console.log(`  ✓ ${orgsWithTeams.length} organisaties, ${totalTeams} teams`);

  console.log("Seeding employees…");
  const allEmployees = await seedEmployees(orgsWithTeams);
  console.log(`  ✓ ${allEmployees.length} medewerkers`);

  console.log("Seeding positions…");
  const allPositions = await seedPositions(orgsWithTeams);
  console.log(`  ✓ ${allPositions.length} posities`);

  console.log("Seeding team memberships…");
  const allMemberships = await seedTeamMemberships(orgsWithTeams, allEmployees);
  console.log(`  ✓ ${allMemberships.length} lidmaatschappen`);

  console.log("Seeding position assignments…");
  const assignmentCount = await seedPositionAssignments(allPositions, allMemberships);
  console.log(`  ✓ ${assignmentCount} toewijzingen`);

  console.log("Seeding financial data…");
  await seedFinancialData(orgsWithTeams);
  const srcCount = ORG_DEFINITIONS.reduce((n, d) => n + d.financialSources.length, 0);
  console.log(`  ✓ ${srcCount} bronnen × ${FINANCIAL_CATEGORIES.length} categorieën`);

  console.log("Reindexing search…");
  await reindex();
  console.log("  ✓ Search index bijgewerkt");
}

main()
  .then(() => { console.log("\n✓ Demo seed voltooid"); process.exit(0); })
  .catch(err => { console.error("\n✗ Demo seed mislukt:", err); process.exit(1); });
