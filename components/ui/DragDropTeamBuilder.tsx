"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

export interface DndEmployee {
  id: string;
  fullName: string;
  currentTeamId: string | null;
  currentMembershipId: string | null;
}

export interface DndTeam {
  id: string;
  name: string;
  organisationName: string;
}

interface Props {
  employees: DndEmployee[];
  teams: DndTeam[];
}

interface PendingMove {
  employeeId: string;
  fromTeamId: string | null;
  toTeamId: string | null;
}

export function DragDropTeamBuilder({ employees: initialEmployees, teams }: Props) {
  const [employees, setEmployees] = useState<DndEmployee[]>(initialEmployees);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const getTeamMembers = useCallback(
    (teamId: string | null) => employees.filter(e => e.currentTeamId === teamId),
    [employees],
  );

  async function moveEmployee(emp: DndEmployee, toTeamId: string | null) {
    if (emp.currentTeamId === toTeamId) return;
    setSaving(emp.id);
    setErrors(prev => { const next = { ...prev }; delete next[emp.id]; return next; });
    setSuccessMsg(null);

    try {
      // End current membership if exists
      if (emp.currentMembershipId) {
        const endRes = await fetch(`/api/team-memberships/${emp.currentMembershipId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "ended", endDate: new Date().toISOString(), reason: "Herplaatsing via indelen-interface" }),
        });
        if (!endRes.ok) {
          const body = await endRes.json();
          setErrors(prev => ({ ...prev, [emp.id]: body.error ?? "Fout bij beëindigen lidmaatschap." }));
          return;
        }
      }

      let newMembershipId: string | null = null;
      if (toTeamId) {
        const addRes = await fetch("/api/team-memberships", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teamId: toTeamId,
            employeeId: emp.id,
            startDate: new Date().toISOString(),
            reason: "Herplaatsing via indelen-interface",
          }),
        });
        if (!addRes.ok) {
          const body = await addRes.json();
          setErrors(prev => ({ ...prev, [emp.id]: body.error ?? "Fout bij toevoegen aan team." }));
          return;
        }
        const { data } = await addRes.json();
        newMembershipId = data.id;
      }

      setEmployees(prev => prev.map(e =>
        e.id === emp.id
          ? { ...e, currentTeamId: toTeamId, currentMembershipId: newMembershipId }
          : e,
      ));
      const toTeam = teams.find(t => t.id === toTeamId);
      setSuccessMsg(
        toTeamId
          ? `${emp.fullName} verplaatst naar ${toTeam?.name ?? toTeamId}`
          : `${emp.fullName} verwijderd uit alle teams`,
      );
    } finally {
      setSaving(null);
    }
  }

  function onDragStart(e: React.DragEvent, empId: string) {
    setDragging(empId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", empId);
  }

  function onDragEnd() {
    setDragging(null);
    setDragOver(null);
  }

  function onDragOver(e: React.DragEvent, zoneId: string | null) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(zoneId ?? "__unassigned__");
  }

  function onDrop(e: React.DragEvent, toTeamId: string | null) {
    e.preventDefault();
    const empId = e.dataTransfer.getData("text/plain");
    const emp = employees.find(e => e.id === empId);
    if (emp) moveEmployee(emp, toTeamId);
    setDragging(null);
    setDragOver(null);
  }

  const unassigned = getTeamMembers(null);

  function EmployeeCard({ emp }: { emp: DndEmployee }) {
    const isDragging = dragging === emp.id;
    const isSaving = saving === emp.id;
    const error = errors[emp.id];

    return (
      <div
        draggable={!isSaving}
        onDragStart={e => onDragStart(e, emp.id)}
        onDragEnd={onDragEnd}
        style={{
          padding: "0.5rem 0.75rem",
          background: isDragging ? "var(--rvo-color-hemelblauw-200, #b3d0ec)" : "white",
          border: "1px solid var(--rvo-color-hemelblauw-200, #b3d0ec)",
          borderRadius: "4px",
          cursor: isSaving ? "wait" : "grab",
          opacity: isDragging ? 0.5 : 1,
          fontSize: "0.875rem",
          userSelect: "none",
          transition: "background 0.1s",
        }}
        title={error ?? undefined}
      >
        <span style={{ fontWeight: 500 }}>{emp.fullName}</span>
        {error && <span style={{ color: "var(--rvo-color-rood-600, #c0392b)", marginLeft: "0.375rem", fontSize: "0.75rem" }}>⚠ {error}</span>}
        {isSaving && <span style={{ color: "var(--rvo-color-grijs-500)", marginLeft: "0.375rem", fontSize: "0.75rem" }}>Opslaan…</span>}
      </div>
    );
  }

  function DropZone({ teamId, children }: { teamId: string | null; children: React.ReactNode }) {
    const zoneKey = teamId ?? "__unassigned__";
    const isOver = dragOver === zoneKey && dragging !== null;

    return (
      <div
        onDragOver={e => onDragOver(e, teamId)}
        onDragLeave={() => setDragOver(null)}
        onDrop={e => onDrop(e, teamId)}
        style={{
          minHeight: "80px",
          padding: "0.5rem",
          background: isOver ? "var(--rvo-color-hemelblauw-100, #d3e4f5)" : "var(--rvo-color-grijs-50, #fafafa)",
          borderRadius: "4px",
          border: isOver ? "2px dashed var(--rvo-color-hemelblauw-600)" : "2px dashed transparent",
          transition: "background 0.1s, border 0.1s",
          display: "flex",
          flexDirection: "column",
          gap: "0.375rem",
        }}
      >
        {children}
        {isOver && (
          <div style={{ textAlign: "center", color: "var(--rvo-color-hemelblauw-600)", fontSize: "0.8125rem", padding: "0.5rem" }}>
            Loslaten om te verplaatsen
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {successMsg && (
        <div role="status" style={{ marginBottom: "1rem", padding: "0.75rem 1rem", background: "var(--rvo-color-groen-50, #f0faf0)", border: "1px solid var(--rvo-color-groen-200, #b8e0b8)", borderRadius: "4px", fontSize: "0.875rem", color: "var(--rvo-color-groen-800)" }}>
          ✓ {successMsg}
        </div>
      )}

      <p style={{ fontSize: "0.875rem", color: "var(--rvo-color-grijs-600)", marginBottom: "1.25rem" }}>
        Sleep medewerkers naar een teamkolom om ze te verplaatsen. Wijzigingen worden direct opgeslagen.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: `200px repeat(${teams.length}, minmax(180px, 1fr))`, gap: "1rem", overflowX: "auto" }}>
        {/* Unassigned column */}
        <div>
          <div style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: "0.5rem", padding: "0.5rem", background: "var(--rvo-color-grijs-200, #e8e8e8)", borderRadius: "4px 4px 0 0" }}>
            Niet ingedeeld ({unassigned.length})
          </div>
          <DropZone teamId={null}>
            {unassigned.length === 0
              ? <span style={{ color: "var(--rvo-color-grijs-400)", fontSize: "0.8125rem", padding: "0.5rem" }}>Geen</span>
              : unassigned.map(emp => <EmployeeCard key={emp.id} emp={emp} />)}
          </DropZone>
        </div>

        {/* Team columns */}
        {teams.map(team => {
          const members = getTeamMembers(team.id);
          return (
            <div key={team.id}>
              <div style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: "0.5rem", padding: "0.5rem", background: "var(--rvo-color-hemelblauw-100, #d3e4f5)", borderRadius: "4px 4px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>
                  {team.name}
                  <span style={{ marginLeft: "0.25rem", fontWeight: 400, color: "var(--rvo-color-grijs-600)" }}>({members.length})</span>
                </span>
                <Link href={`/teams/${team.id}`} style={{ fontSize: "0.75rem", color: "var(--rvo-color-hemelblauw-700)" }}>→</Link>
              </div>
              <DropZone teamId={team.id}>
                {members.length === 0
                  ? <span style={{ color: "var(--rvo-color-grijs-400)", fontSize: "0.8125rem", padding: "0.5rem" }}>Leeg</span>
                  : members.map(emp => <EmployeeCard key={emp.id} emp={emp} />)}
              </DropZone>
            </div>
          );
        })}
      </div>
    </div>
  );
}
