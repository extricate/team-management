/**
 * Demo seeder — COC2-I&V, Ministerie van Defensie.
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
import type { Organisation, Team, Employee } from "../schema";
import { reindex } from "../../search/reindex";
import { OPF_TYPES } from "../../opf-types";

// ── Static content ─────────────────────────────────────────────────────────────

const ORG_DEFINITIONS = [
  // ── OS1: Secties ──────────────────────────────────────────────────────────────
  {
    name: "Plan & BITA",
    type: "OS1" as const,
    employeeCount: 18,
    teams: [
      {
        name: "Beleid & Advies",
        description: "Ontwikkeling en advisering van IT-beleid en -strategie voor het defensie-cyberdomein.",
      },
      {
        name: "Informatiemanagement",
        description: "Beheer van informatiearchitectuur en informatiestromen binnen COC2-I&V.",
      },
      {
        name: "Technische Architectuur",
        description: "Ontwerp en bewaking van de enterprise-architectuur van defensie-informatiesystemen.",
      },
      {
        name: "Portfolio & Planning",
        description: "Coördinatie van het IT-portfolio, capaciteitsplanning en voortgangsbewaking van initiatieven.",
      },
    ],
    financialSources: [
      { name: "Beleidsondersteuning COC2-I&V 2025",  projectId: "2025-BITA-001" },
      { name: "Architectuurprogramma Defensie 2025",  projectId: "2025-BITA-002" },
    ],
  },
  {
    name: "Projecten & Ontwikkeling",
    type: "OS1" as const,
    employeeCount: 24,
    teams: [
      {
        name: "Projectmanagement",
        description: "Aansturing van IT-projecten en -programma's conform PRINCE2- en SAFe-methodiek.",
      },
      {
        name: "Applicatieontwikkeling",
        description: "Ontwikkeling van mission-critical defensieapplicaties en systeeminterfaces.",
      },
      {
        name: "Integratie & Test",
        description: "Systeemintegratie, acceptatietesten en kwaliteitsborging van defensiesystemen.",
      },
      {
        name: "DevSecOps",
        description: "Veilige en geautomatiseerde software-deliverypipelines voor defensiesystemen.",
      },
    ],
    financialSources: [
      { name: "Projectportfolio Digitalisering 2025",  projectId: "2025-PO-001" },
      { name: "Digitale Transformatie Defensie 2025",  projectId: "2025-DTD-001" },
    ],
  },
  {
    name: "Systeemmanagement & Beheer",
    type: "OS1" as const,
    employeeCount: 30,
    teams: [
      {
        name: "Infrastructuurbeheer",
        description: "Beheer van servers, opslag en datacenterinfrastructuur van COC2-I&V.",
      },
      {
        name: "Applicatiebeheer",
        description: "Functioneel en technisch beheer van operationele defensieapplicaties.",
      },
      {
        name: "Security Operations Center",
        description: "24/7 monitoring, detectie en respons op cyberdreigingen gericht op defensienetwerken.",
      },
      {
        name: "Servicedesk & Support",
        description: "Eerstelijns gebruikersondersteuning en incidentafhandeling voor defensiepersoneel.",
      },
    ],
    financialSources: [
      { name: "Beheer & Onderhoud ICT 2025",   projectId: "2025-SMB-001" },
      { name: "Datacenter Modernisering 2025",  projectId: "2025-SMB-002" },
    ],
  },

  // ── OS2: Subdomeinen ──────────────────────────────────────────────────────────
  {
    name: "B2C2&G",
    type: "OS2" as const,
    employeeCount: 16,
    teams: [
      {
        name: "Command & Control Systemen",
        description: "Beheer en onderhoud van C2-systemen voor grondgebonden commandovoering.",
      },
      {
        name: "Grondgebonden Communicatie",
        description: "Tactische en strategische communicatiesystemen voor grondgebonden eenheden.",
      },
      {
        name: "Tactische Netwerken",
        description: "Militaire tactische datanetwerken en radiocommunicatie-infrastructuur in het veld.",
      },
    ],
    financialSources: [
      { name: "Vervangingsprogramma C2-Systemen 2025",  projectId: "2025-B2C2G-001" },
    ],
  },
  {
    name: "HOI&D",
    type: "OS2" as const,
    employeeCount: 14,
    teams: [
      {
        name: "HQ Informatiesystemen",
        description: "IT-ondersteuning van de hoofdkwartiersfunctie en operationele staven.",
      },
      {
        name: "Operationele Informatieverwerking",
        description: "Verwerking en verspreiding van operationele en tactische situatiebeelden.",
      },
      {
        name: "Datalink & TADIL",
        description: "Link-16, JREAP-C en overige NATO-datalinksystemen en -protocollen.",
      },
    ],
    financialSources: [
      { name: "HQ Digitalisering & Operaties 2025",  projectId: "2025-HOID-001" },
    ],
  },
  {
    name: "G&M",
    type: "OS2" as const,
    employeeCount: 14,
    teams: [
      {
        name: "Grens",
        description: "IT-systemen en communicatieoplossingen voor de grenssystemen.",
      },
      {
        name: "Migratie Systemen",
        description: "IT voor Migratie.",
      },
      {
        name: "Joint Capabilities",
        description: "Gezamenlijke IT-capaciteiten voor joint en combined operations.",
      },
    ],
    financialSources: [
      { name: "Domein Grens & Migratie 2025",  projectId: "2025-GM-001" },
    ],
  },
  {
    name: "Inlichtingen",
    type: "OS2" as const,
    employeeCount: 12,
    teams: [
      {
        name: "Inlichtingensystemen",
        description: "Beheer van gespecialiseerde systemen voor inlichtingenverzameling en -verwerking.",
      },
      {
        name: "OSINT & Data-analyse",
        description: "Open-source inlichtingen en geavanceerde data-analysetechnieken voor defensie.",
      },
      {
        name: "Technische Inlichtingenverzameling",
        description: "Technische sensoren en systemen voor SIGINT- en IMINT-verzameling.",
      },
    ],
    financialSources: [
      { name: "Inlichtingen IT-portfolio 2025",  projectId: "2025-INLICHT-001" },
    ],
  },
  {
    name: "CEMA",
    type: "OS2" as const,
    employeeCount: 12,
    teams: [
      {
        name: "Cyberoperaties",
        description: "Offensieve en defensieve cyberoperaties en ontwikkeling van cybercapaciteiten.",
      },
      {
        name: "Elektromagnetisch Spectrumbeheer",
        description: "Beheer en coördinatie van het elektromagnetisch spectrum voor militaire operaties.",
      },
      {
        name: "Electronic Warfare",
        description: "Electronic support, electronic attack en electronic protection systemen en oefeningen.",
      },
    ],
    financialSources: [
      { name: "Cybercapaciteit Uitbreiding 2025",  projectId: "2025-CEMA-001" },
      { name: "EMS-modernisering 2025",             projectId: "2025-CEMA-002" },
    ],
  },
] as const;

// Defensie IT-functiegroepen met bijbehorende salarisschalen
const POSITION_DEFS = [
  { opfKey: "OPF1",          schaal: "10", annualCost: 55000  },
  { opfKey: "OPF2b-vap",     schaal: "9",  annualCost: 49500  },
  { opfKey: "OPF2b-nw",      schaal: "11", annualCost: 95000  },
  { opfKey: "OPF3",          schaal: "10", annualCost: 58000  },
  { opfKey: "OPF4",          schaal: "9",  annualCost: 47000  },
  { opfKey: "OPF5",          schaal: "8",  annualCost: 44000  },
  { opfKey: "OPF8",          schaal: "12", annualCost: 78000  },
  { opfKey: "OPF9-inhuur",   schaal: "13", annualCost: 130000 },
  { opfKey: "OPF9-wba",      schaal: "6",  annualCost: 32000  },
  { opfKey: "OPF9-stagiair", schaal: "2",  annualCost: 18000  },
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
  type OrgWithTeams = { org: Organisation; teams: Team[]; employeeCount: number };
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

    result.push({ org, teams: orgTeams, employeeCount: def.employeeCount });
  }

  return result;
}

// ── Employees ─────────────────────────────────────────────────────────────────

async function seedEmployees(orgsWithTeams: { org: Organisation; employeeCount: number }[]) {
  type EmployeeWithOrg = { emp: Employee; orgId: string };
  const result: EmployeeWithOrg[] = [];

  for (const { org, employeeCount } of orgsWithTeams) {
    const rows = Array.from({ length: employeeCount }, () => ({
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
      const defs = faker.helpers.shuffle([...POSITION_DEFS]).slice(0, 3);

      const rows = defs.map((def, i) => {
        const opfDef = OPF_TYPES.find(t => t.key === def.opfKey);
        return {
          teamId:        team.id,
          type:          opfDef?.label ?? def.opfKey,
          opfType:       def.opfKey,
          positionCode:  `${team.id.slice(0, 6).toUpperCase()}-${def.opfKey}-${i + 1}`,
          schaal:        def.schaal,
          annualCost:    String(def.annualCost),
          status:        pick(statusWeights),
          expectedStart: faker.date.between({ from: "2024-01-01", to: "2025-06-01" }),
        };
      });

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
    const buckets = distribute(orgEmps, orgTeams.length);

    const primaryRows = buckets.flatMap((bucket, i) =>
      bucket.map(emp => ({
        teamId:     orgTeams[i].id,
        employeeId: emp.id,
        startDate:  faker.date.between({ from: "2022-01-01", to: "2024-06-01" }),
        status:     "active" as const,
      }))
    );

    if (primaryRows.length > 0) {
      await db.insert(teamMemberships).values(primaryRows);
      created.push(...primaryRows.map(r => ({ teamId: r.teamId, empId: r.employeeId })));
    }

    // ~20 % of medewerkers krijgen een tweede teamlidmaatschap
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
  allPositions:   { pos: typeof positions.$inferSelect; teamId: string }[],
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

        // Defensie-schaal budgetten
        const baseAmount =
          category === "PERSEX"      ? faker.number.int({ min: 1_000_000, max: 6_000_000 }) :
          category === "MATEX"       ? faker.number.int({ min:   200_000, max: 1_500_000 }) :
          /* Investeringen */           faker.number.int({ min:   500_000, max: 5_000_000 });

        const isReleased = faker.datatype.boolean({ probability: 0.6 });

        const [amount] = await db.insert(financialSourceAmounts).values({
          financialSourceId: source.id,
          financialTypeId:   ft.id,
          amount:            String(baseAmount),
          status:            isReleased ? "released" : "concept",
          effectiveDate:     new Date(`${year}-01-01`),
          releaseDate:       isReleased ? new Date(`${year}-03-01`) : undefined,
        }).returning();

        // Vrijgegeven PERSEX-budgetten verdelen over 1–2 teams
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

  const [existing] = await db.select().from(organisations).limit(1);
  if (existing && !shouldReset) {
    console.log("⚠  Demo data al aanwezig. Gebruik --reset om te wissen en opnieuw te seeden.");
    return;
  }

  if (shouldReset) await resetAll();

  console.log("Seeding COC2-I&V — Ministerie van Defensie\n");

  console.log("Organisaties & teams…");
  const orgsWithTeams = await seedOrganisationsAndTeams();
  const totalTeams = orgsWithTeams.reduce((n, o) => n + o.teams.length, 0);
  console.log(`  ✓ ${orgsWithTeams.length} organisaties (3 secties + 5 subdomeinen), ${totalTeams} teams`);

  console.log("Medewerkers…");
  const allEmployees = await seedEmployees(orgsWithTeams);
  console.log(`  ✓ ${allEmployees.length} medewerkers`);

  console.log("Posities…");
  const allPositions = await seedPositions(orgsWithTeams);
  console.log(`  ✓ ${allPositions.length} posities`);

  console.log("Teamlidmaatschappen…");
  const allMemberships = await seedTeamMemberships(orgsWithTeams, allEmployees);
  console.log(`  ✓ ${allMemberships.length} lidmaatschappen`);

  console.log("Positietoewijzingen…");
  const assignmentCount = await seedPositionAssignments(allPositions, allMemberships);
  console.log(`  ✓ ${assignmentCount} toewijzingen`);

  console.log("Financieringsdata…");
  await seedFinancialData(orgsWithTeams);
  const srcCount = ORG_DEFINITIONS.reduce((n, d) => n + d.financialSources.length, 0);
  console.log(`  ✓ ${srcCount} financieringsbronnen × ${FINANCIAL_CATEGORIES.length} categorieën`);

  console.log("Zoekindex bijwerken…");
  await reindex();
  console.log("  ✓ Klaar");
}

main()
  .then(() => { console.log("\n✓ Seed voltooid"); process.exit(0); })
  .catch(err => { console.error("\n✗ Seed mislukt:", err); process.exit(1); });
