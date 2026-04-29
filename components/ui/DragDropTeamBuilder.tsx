"use client";

import { useState, useRef, useCallback } from "react";
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

// ── Sub-components defined at module level so React never remounts them ────────
// Defining them inside the parent causes a new component type each render,
// which unmounts the DOM node mid-gesture and breaks drag-and-drop.

interface EmployeeCardProps {
  emp: DndEmployee;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent, empId: string) => void;
  onDragEnd: () => void;
}

function EmployeeCard({ emp, isDragging, onDragStart, onDragEnd }: EmployeeCardProps) {
  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, emp.id)}
      onDragEnd={onDragEnd}
      style={{
        padding: "0.5rem 0.75rem",
        background: isDragging ? "var(--rvo-color-hemelblauw-200)" : "white",
        border: "1px solid var(--rvo-color-hemelblauw-200)",
        borderRadius: "4px",
        cursor: "grab",
        opacity: isDragging ? 0.5 : 1,
        fontSize: "0.875rem",
        userSelect: "none",
        transition: "background 0.1s",
      }}
    >
      <span style={{ fontWeight: 500 }}>{emp.fullName}</span>
    </div>
  );
}

interface DropZoneProps {
  teamId: string | null;
  isOver: boolean;
  onDragOver: (e: React.DragEvent, zoneId: string | null) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, toTeamId: string | null) => void;
  children: React.ReactNode;
}

function DropZone({ teamId, isOver, onDragOver, onDragLeave, onDrop, children }: DropZoneProps) {
  return (
    <div
      onDragOver={e => onDragOver(e, teamId)}
      onDragLeave={onDragLeave}
      onDrop={e => onDrop(e, teamId)}
      style={{
        minHeight: "80px",
        padding: "0.5rem",
        background: isOver ? "var(--rvo-color-hemelblauw-100)" : "var(--rvo-color-grijs-50)",
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

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  employees: DndEmployee[];
  teams: DndTeam[];
}

type Committed = Map<string, { membershipId: string | null; teamId: string | null }>;

export function DragDropTeamBuilder({ employees: initialEmployees, teams }: Props) {
  const [employees, setEmployees] = useState<DndEmployee[]>(initialEmployees);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [pending, setPending] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const committedRef = useRef<Promise<Committed>>(
    Promise.resolve(
      new Map(initialEmployees.map(e => [e.id, { membershipId: e.currentMembershipId, teamId: e.currentTeamId }]))
    )
  );

  const getTeamMembers = useCallback(
    (teamId: string | null) => employees.filter(e => e.currentTeamId === teamId),
    [employees],
  );

  function moveEmployee(emp: DndEmployee, toTeamId: string | null) {
    if (emp.currentTeamId === toTeamId) return;

    setEmployees(prev => prev.map(e =>
      e.id === emp.id ? { ...e, currentTeamId: toTeamId, currentMembershipId: null } : e
    ));
    const toTeam = teams.find(t => t.id === toTeamId);
    setSuccessMsg(
      toTeamId
        ? `${emp.fullName} verplaatst naar ${toTeam?.name ?? toTeamId}`
        : `${emp.fullName} verwijderd uit alle teams`,
    );
    setErrorMsg(null);

    setPending(n => n + 1);
    committedRef.current = committedRef.current
      .then(async (committed): Promise<Committed> => {
        const c = committed.get(emp.id) ?? { membershipId: null, teamId: null };
        const next = new Map(committed);

        if (c.membershipId) {
          const res = await fetch(`/api/team-memberships/${c.membershipId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "ended", endDate: new Date().toISOString(), reason: "Herplaatsing via indelen-interface" }),
          });
          if (!res.ok) throw new Error((await res.json()).error ?? "Fout bij beëindigen lidmaatschap.");
        }

        let newMembershipId: string | null = null;
        if (toTeamId) {
          const res = await fetch("/api/team-memberships", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              teamId: toTeamId,
              employeeId: emp.id,
              startDate: new Date().toISOString(),
              reason: "Herplaatsing via indelen-interface",
            }),
          });
          if (!res.ok) throw new Error((await res.json()).error ?? "Fout bij toevoegen aan team.");
          const { data } = await res.json();
          newMembershipId = data.id;
        }

        next.set(emp.id, { membershipId: newMembershipId, teamId: toTeamId });
        setEmployees(prev => prev.map(e =>
          e.id === emp.id ? { ...e, currentMembershipId: newMembershipId } : e
        ));
        return next;
      })
      .catch((err: unknown) => {
        setErrorMsg(err instanceof Error ? err.message : "Onverwachte fout. Vernieuw de pagina.");
        return committedRef.current;
      })
      .finally(() => setPending(n => n - 1));
  }

  const onDragStart = useCallback((e: React.DragEvent, empId: string) => {
    setDragging(empId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", empId);
  }, []);

  const onDragEnd = useCallback(() => { setDragging(null); setDragOver(null); }, []);

  const onDragOver = useCallback((e: React.DragEvent, zoneId: string | null) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(zoneId ?? "__unassigned__");
  }, []);

  const onDragLeave = useCallback(() => setDragOver(null), []);

  function onDrop(e: React.DragEvent, toTeamId: string | null) {
    e.preventDefault();
    const emp = employees.find(x => x.id === e.dataTransfer.getData("text/plain"));
    if (emp) moveEmployee(emp, toTeamId);
    setDragging(null);
    setDragOver(null);
  }

  const unassigned = getTeamMembers(null);

  return (
    <div>
      {errorMsg && (
        <div role="alert" style={{ marginBottom: "1rem", padding: "0.75rem 1rem", background: "var(--rvo-color-rood-50, #fdecea)", border: "1px solid var(--rvo-color-rood-200, #f5c6cb)", borderRadius: "4px", fontSize: "0.875rem", color: "var(--rvo-color-rood-800, #7d1a0f)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>⚠ {errorMsg}</span>
          <button onClick={() => window.location.reload()} className="utrecht-button utrecht-button--secondary-action" style={{ fontSize: "0.8125rem", padding: "0.25rem 0.75rem" }}>Vernieuwen</button>
        </div>
      )}
      {successMsg && !errorMsg && (
        <div role="status" style={{ marginBottom: "1rem", padding: "0.75rem 1rem", background: "var(--rvo-color-groen-50)", border: "1px solid var(--rvo-color-groen-200)", borderRadius: "4px", fontSize: "0.875rem", color: "var(--rvo-color-groen-800)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>✓ {successMsg}</span>
          {pending > 0 && <span style={{ fontSize: "0.8125rem", color: "var(--rvo-color-grijs-600)" }}>Verwerken… ({pending})</span>}
        </div>
      )}

      <p style={{ fontSize: "0.875rem", color: "var(--rvo-color-grijs-600)", marginBottom: "1.25rem" }}>
        Sleep medewerkers naar een teamkolom om ze te verplaatsen. Wijzigingen worden direct opgeslagen.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: `200px repeat(${teams.length}, minmax(180px, 1fr))`, gap: "1rem", overflowX: "auto" }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: "0.5rem", padding: "0.5rem", background: "var(--rvo-color-grijs-200)", borderRadius: "4px 4px 0 0" }}>
            Niet ingedeeld ({unassigned.length})
          </div>
          <DropZone
            teamId={null}
            isOver={dragOver === "__unassigned__" && dragging !== null}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            {unassigned.length === 0
              ? <span style={{ color: "var(--rvo-color-grijs-400)", fontSize: "0.8125rem", padding: "0.5rem" }}>Geen</span>
              : unassigned.map(emp => (
                  <EmployeeCard
                    key={emp.id}
                    emp={emp}
                    isDragging={dragging === emp.id}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                  />
                ))}
          </DropZone>
        </div>

        {teams.map(team => {
          const members = getTeamMembers(team.id);
          return (
            <div key={team.id}>
              <div style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: "0.5rem", padding: "0.5rem", background: "var(--rvo-color-hemelblauw-100)", borderRadius: "4px 4px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>
                  {team.name}
                  <span style={{ marginLeft: "0.25rem", fontWeight: 400, color: "var(--rvo-color-grijs-600)" }}>({members.length})</span>
                </span>
                <Link href={`/teams/${team.id}`} style={{ fontSize: "0.75rem", color: "var(--rvo-color-hemelblauw-700)" }}>→</Link>
              </div>
              <DropZone
                teamId={team.id}
                isOver={dragOver === team.id && dragging !== null}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
              >
                {members.length === 0
                  ? <span style={{ color: "var(--rvo-color-grijs-400)", fontSize: "0.8125rem", padding: "0.5rem" }}>Leeg</span>
                  : members.map(emp => (
                      <EmployeeCard
                        key={emp.id}
                        emp={emp}
                        isDragging={dragging === emp.id}
                        onDragStart={onDragStart}
                        onDragEnd={onDragEnd}
                      />
                    ))}
              </DropZone>
            </div>
          );
        })}
      </div>
    </div>
  );
}
