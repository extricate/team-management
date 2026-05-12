import { db } from "@/lib/db";
import {
  organisations, teams, employees, positions,
  financialSourceAmounts, auditEvents, teamMemberships, positionAssignments,
} from "@/lib/db/schema";
import type { AuditEvent, User } from "@/lib/db/schema";
import { isNull, desc } from "drizzle-orm";
import { detectPositionConflicts, collectUpcomingEvents } from "@/lib/dashboard";
import type { PositionConflict, UpcomingEvent } from "@/lib/dashboard";

export interface DashboardStats {
  orgCount: number;
  teamCount: number;
  employeeCount: number;
  filledPositions: number;
  openPositions: number;
  totalPositions: number;
  releasedBudget: number;
  conceptBudget: number;
}

export interface DashboardData {
  stats: DashboardStats;
  conflicts: PositionConflict[];
  upcomingEvents: UpcomingEvent[];
  recentActivity: Array<AuditEvent & { actorUser: User | null }>;
}

export async function loadDashboardData(): Promise<DashboardData> {
  const [
    allOrgs, allTeams, allEmployees, allPositions, allAmounts, recentActivity,
    activeMemberships, activeAssignments,
  ] = await Promise.all([
    db.select({ id: organisations.id }).from(organisations).where(isNull(organisations.deletedAt)),
    db.select({ id: teams.id }).from(teams).where(isNull(teams.deletedAt)),
    db.select({ id: employees.id }).from(employees).where(isNull(employees.deletedAt)),
    db.query.positions.findMany({
      where: isNull(positions.deletedAt),
      with: { teamCouplings: { with: { team: true } }, fundingAllocations: true },
    }),
    db.select({ amount: financialSourceAmounts.amount, status: financialSourceAmounts.status }).from(financialSourceAmounts),
    db.query.auditEvents.findMany({
      with: { actorUser: true },
      orderBy: [desc(auditEvents.createdAt)],
      limit: 8,
    }),
    db.query.teamMemberships.findMany({
      where: isNull(teamMemberships.endDate),
      with: { employee: true, team: true },
    }),
    db.query.positionAssignments.findMany({
      where: isNull(positionAssignments.endDate),
      with: { employee: true, position: { with: { teamCouplings: { with: { team: true } } } } },
    }),
  ]);

  const filledPositions = allPositions.filter(p => p.status === "gevuld").length;
  const openPositions   = allPositions.filter(p => p.status === "open").length;
  const totalPositions  = allPositions.length;

  const releasedBudget = allAmounts
    .filter(a => a.status === "released")
    .reduce((sum, a) => sum + Number(a.amount), 0);
  const conceptBudget = allAmounts
    .filter(a => a.status === "concept")
    .reduce((sum, a) => sum + Number(a.amount), 0);

  const now = new Date();
  const conflicts = detectPositionConflicts(allPositions);
  const upcomingEvents = collectUpcomingEvents(allPositions, activeMemberships, activeAssignments, now, 0, 90);

  return {
    stats: {
      orgCount: allOrgs.length,
      teamCount: allTeams.length,
      employeeCount: allEmployees.length,
      filledPositions,
      openPositions,
      totalPositions,
      releasedBudget,
      conceptBudget,
    },
    conflicts,
    upcomingEvents,
    recentActivity: recentActivity as Array<AuditEvent & { actorUser: User | null }>,
  };
}
