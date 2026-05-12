import type { Position, TeamMembership, PositionAssignment } from "@/lib/db/schema";

export type ConflictType = "late_start" | "unfunded";

export interface PositionConflict {
  type: ConflictType;
  positionId: string;
  positionType: string;
  teamId: string;
  teamName: string;
  requiredBefore: Date | null;
  expectedStart: Date | null;
}

export interface UpcomingEvent {
  kind: "position_start" | "position_end" | "membership_end" | "assignment_end";
  label: string;
  entityId: string;
  teamName?: string;
  employeeName?: string;
  date: Date;
  daysUntil: number;
}

type PositionWithTeamAndAllocations = Pick<
  Position,
  "id" | "type" | "status" | "expectedStart" | "expectedEnd" | "requiredBefore"
> & {
  teamCouplings: Array<{ teamId: string; team: { name: string } }>;
  fundingAllocations: Array<{ status: string }>;
};

type MembershipWithEmployeeAndTeam = Pick<
  TeamMembership,
  "id" | "status" | "endDate"
> & {
  employee: { firstName: string; prefixName?: string | null; lastName: string };
  team: { name: string };
};

type AssignmentWithPositionAndEmployee = Pick<
  PositionAssignment,
  "id" | "status" | "endDate"
> & {
  position: { type: string; teamCouplings: Array<{ team: { name: string } }> };
  employee: { firstName: string; prefixName?: string | null; lastName: string };
};

export function detectPositionConflicts(
  positions: PositionWithTeamAndAllocations[],
): PositionConflict[] {
  const conflicts: PositionConflict[] = [];

  for (const pos of positions) {
    if (pos.status === "gesloten") continue;

    const activeTeamId = pos.teamCouplings[0]?.teamId ?? "";
    const activeTeamName = pos.teamCouplings[0]?.team?.name ?? "Onbekend team";

    // Late start: expectedStart is after requiredBefore
    if (pos.requiredBefore && pos.expectedStart && pos.expectedStart > pos.requiredBefore) {
      conflicts.push({
        type: "late_start",
        positionId: pos.id,
        positionType: pos.type,
        teamId: activeTeamId,
        teamName: activeTeamName,
        requiredBefore: pos.requiredBefore,
        expectedStart: pos.expectedStart,
      });
    }

    // Unfunded: gepland/open with no active funding allocation
    if (pos.status === "gepland" || pos.status === "open") {
      const hasFunding = pos.fundingAllocations.some((fa) => fa.status === "active");
      if (!hasFunding) {
        conflicts.push({
          type: "unfunded",
          positionId: pos.id,
          positionType: pos.type,
          teamId: activeTeamId,
          teamName: activeTeamName,
          requiredBefore: pos.requiredBefore ?? null,
          expectedStart: pos.expectedStart ?? null,
        });
      }
    }
  }

  return conflicts;
}

function fullName(e: { firstName: string; prefixName?: string | null; lastName: string }): string {
  return e.prefixName ? `${e.firstName} ${e.prefixName} ${e.lastName}` : `${e.firstName} ${e.lastName}`;
}

export function collectUpcomingEvents(
  positions: PositionWithTeamAndAllocations[],
  memberships: MembershipWithEmployeeAndTeam[],
  assignments: AssignmentWithPositionAndEmployee[],
  now: Date,
  daysMin = 0,
  daysMax = 90,
): UpcomingEvent[] {
  const events: UpcomingEvent[] = [];

  const msMin = daysMin * 86_400_000;
  const msMax = daysMax * 86_400_000;

  function inRange(date: Date | null | undefined): boolean {
    if (!date) return false;
    const diff = date.getTime() - now.getTime();
    return diff >= msMin && diff <= msMax;
  }

  function daysUntil(date: Date): number {
    return Math.ceil((date.getTime() - now.getTime()) / 86_400_000);
  }

  for (const pos of positions) {
    if (pos.status === "gesloten") continue;
    const teamName = pos.teamCouplings[0]?.team?.name;
    if (inRange(pos.expectedStart)) {
      events.push({
        kind: "position_start",
        label: teamName ? `Positie "${pos.type}" (${teamName}) start` : `Positie "${pos.type}" start`,
        entityId: pos.id,
        teamName,
        date: pos.expectedStart!,
        daysUntil: daysUntil(pos.expectedStart!),
      });
    }
    if (inRange(pos.expectedEnd)) {
      events.push({
        kind: "position_end",
        label: teamName ? `Positie "${pos.type}" (${teamName}) eindigt` : `Positie "${pos.type}" eindigt`,
        entityId: pos.id,
        teamName,
        date: pos.expectedEnd!,
        daysUntil: daysUntil(pos.expectedEnd!),
      });
    }
  }

  for (const m of memberships) {
    if (m.status !== "active") continue;
    if (inRange(m.endDate)) {
      events.push({
        kind: "membership_end",
        label: `Lidmaatschap ${fullName(m.employee)} (${m.team.name}) eindigt`,
        entityId: m.id,
        teamName: m.team.name,
        employeeName: fullName(m.employee),
        date: m.endDate!,
        daysUntil: daysUntil(m.endDate!),
      });
    }
  }

  for (const a of assignments) {
    if (a.status !== "active") continue;
    if (inRange(a.endDate)) {
      events.push({
        kind: "assignment_end",
        label: `Toewijzing ${fullName(a.employee)} aan "${a.position.type}" eindigt`,
        entityId: a.id,
        teamName: a.position.teamCouplings[0]?.team?.name,
        employeeName: fullName(a.employee),
        date: a.endDate!,
        daysUntil: daysUntil(a.endDate!),
      });
    }
  }

  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
}
