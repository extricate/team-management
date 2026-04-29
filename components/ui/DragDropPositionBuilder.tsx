"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { StatusBadge } from "./StatusBadge";

export interface DndPosition {
  id: string;
  type: string;
  teamId: string;
  status: string;
  activeAssignmentId: string | null;
  activeEmployeeId: string | null;
  activeEmployeeName: string | null;
}

export interface DndPositionEmployee {
  id: string;
  fullName: string;
  currentAssignmentId: string | null;
  currentPositionId: string | null;
}

export interface DndPositionTeam {
  id: string;
  name: string;
}

// ── Sub-components defined at module level so React never remounts them ────────
// Defining them inside the parent causes a new component type each render,
// which unmounts the DOM node mid-gesture and breaks drag-and-drop.

interface EmployeeCardProps {
  emp: DndPositionEmployee;
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
        padding: "0.375rem 0.625rem",
        background: isDragging ? "var(--rvo-color-hemelblauw-200)" : "white",
        border: "1px solid var(--rvo-color-hemelblauw-200)",
        borderRadius: "4px",
        cursor: "grab",
        opacity: isDragging ? 0.5 : 1,
        fontSize: "0.8125rem",
        userSelect: "none",
        transition: "background 0.1s",
      }}
    >
      <span style={{ fontWeight: 500 }}>{emp.fullName}</span>
    </div>
  );
}

interface PositionCardProps {
  pos: DndPosition;
  assignedEmp: DndPositionEmployee | null;
  isOver: boolean;
  draggingId: string | null;
  onDragOver: (e: React.DragEvent, zoneId: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, toPositionId: string | null) => void;
  onDragStart: (e: React.DragEvent, empId: string) => void;
  onDragEnd: () => void;
}

function PositionCard({ pos, assignedEmp, isOver, draggingId, onDragOver, onDragLeave, onDrop, onDragStart, onDragEnd }: PositionCardProps) {
  const statusColor = pos.status === "filled" ? "green" : pos.status === "open" ? "orange" : "grey";
  return (
    <div style={{ border: "1px solid var(--rvo-color-hemelblauw-200)", borderRadius: "4px", overflow: "hidden", marginBottom: "0.5rem" }}>
      <div style={{ padding: "0.3125rem 0.625rem", background: "var(--rvo-color-hemelblauw-50)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", borderBottom: "1px solid var(--rvo-color-hemelblauw-200)" }}>
        <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>{pos.type}</span>
        <StatusBadge label={pos.status} color={statusColor} />
      </div>
      <div
        onDragOver={e => onDragOver(e, pos.id)}
        onDragLeave={onDragLeave}
        onDrop={e => onDrop(e, pos.id)}
        style={{
          padding: "0.375rem",
          minHeight: "44px",
          background: isOver ? "var(--rvo-color-hemelblauw-100)" : "var(--rvo-color-grijs-50)",
          border: isOver ? "2px dashed var(--rvo-color-hemelblauw-600)" : "2px dashed transparent",
          transition: "background 0.1s, border 0.1s",
          display: "flex",
          flexDirection: "column",
          gap: "0.25rem",
        }}
      >
        {assignedEmp ? (
          <EmployeeCard
            emp={assignedEmp}
            isDragging={draggingId === assignedEmp.id}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ) : (
          <span style={{ color: isOver ? "var(--rvo-color-hemelblauw-600)" : "var(--rvo-color-grijs-400)", fontSize: "0.75rem", padding: "0.25rem" }}>
            {isOver ? "Loslaten om in te delen" : "Sleep medewerker hierheen"}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  employees: DndPositionEmployee[];
  teams: DndPositionTeam[];
  positions: DndPosition[];
}

type Committed = Map<string, { assignmentId: string | null; positionId: string | null }>;

export function DragDropPositionBuilder({ employees: initialEmployees, teams, positions: initialPositions }: Props) {
  const [employees, setEmployees] = useState<DndPositionEmployee[]>(initialEmployees);
  const [positions, setPositions] = useState<DndPosition[]>(initialPositions);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [pending, setPending] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const committedRef = useRef<Promise<Committed>>(
    Promise.resolve(
      new Map(initialEmployees.map(e => [e.id, { assignmentId: e.currentAssignmentId, positionId: e.currentPositionId }]))
    )
  );

  const getTeamPositions = useCallback(
    (teamId: string) => positions.filter(p => p.teamId === teamId),
    [positions],
  );

  const unassigned = employees.filter(e => !e.currentPositionId);

  function moveEmployee(emp: DndPositionEmployee, toPositionId: string | null) {
    if (emp.currentPositionId === toPositionId) return;

    const targetPos = positions.find(p => p.id === toPositionId) ?? null;
    const displacedEmpId = targetPos?.activeEmployeeId ?? null;

    setEmployees(prev => prev.map(e => {
      if (e.id === emp.id) return { ...e, currentPositionId: toPositionId, currentAssignmentId: null };
      if (displacedEmpId && e.id === displacedEmpId) return { ...e, currentPositionId: null, currentAssignmentId: null };
      return e;
    }));
    setPositions(prev => prev.map(p => {
      if (p.id === toPositionId) return { ...p, status: "filled", activeEmployeeId: emp.id, activeEmployeeName: emp.fullName, activeAssignmentId: null };
      if (p.id === emp.currentPositionId) return { ...p, status: "open", activeEmployeeId: null, activeEmployeeName: null, activeAssignmentId: null };
      return p;
    }));
    setSuccessMsg(toPositionId ? `${emp.fullName} → ${targetPos?.type}` : `${emp.fullName} verwijderd uit positie`);
    setErrorMsg(null);

    setPending(n => n + 1);
    committedRef.current = committedRef.current
      .then(async (committed): Promise<Committed> => {
        const c = committed.get(emp.id) ?? { assignmentId: null, positionId: null };
        const next = new Map(committed);

        const displacedEntry = toPositionId
          ? [...next.entries()].find(([id, v]) => id !== emp.id && v.positionId === toPositionId)
          : undefined;
        const displacedId = displacedEntry?.[0] ?? null;
        const displacedAssId = displacedEntry?.[1].assignmentId ?? null;

        if (c.assignmentId) {
          const res = await fetch(`/api/position-assignments/${c.assignmentId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "ended", endDate: new Date().toISOString() }),
          });
          if (!res.ok) throw new Error((await res.json()).error ?? "Fout bij beëindigen toewijzing.");
        }
        if (c.positionId) {
          await fetch(`/api/positions/${c.positionId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "open" }),
          });
        }
        if (displacedAssId) {
          const res = await fetch(`/api/position-assignments/${displacedAssId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "ended", endDate: new Date().toISOString() }),
          });
          if (!res.ok) throw new Error((await res.json()).error ?? "Fout bij verplaatsen huidige bezetter.");
        }

        let newAssignmentId: string | null = null;
        if (toPositionId) {
          const res = await fetch("/api/position-assignments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ positionId: toPositionId, employeeId: emp.id, startDate: new Date().toISOString() }),
          });
          if (!res.ok) throw new Error((await res.json()).error ?? "Fout bij aanmaken toewijzing.");
          const { data } = await res.json();
          newAssignmentId = data.id;
          await fetch(`/api/positions/${toPositionId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "filled" }),
          });
        }

        next.set(emp.id, { assignmentId: newAssignmentId, positionId: toPositionId });
        if (displacedId) next.set(displacedId, { assignmentId: null, positionId: null });
        setEmployees(prev => prev.map(e =>
          e.id === emp.id ? { ...e, currentAssignmentId: newAssignmentId } : e
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

  const onDragOver = useCallback((e: React.DragEvent, zoneId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(zoneId);
  }, []);

  const onDragLeave = useCallback(() => setDragOver(null), []);

  function onDrop(e: React.DragEvent, toPositionId: string | null) {
    e.preventDefault();
    const emp = employees.find(x => x.id === e.dataTransfer.getData("text/plain"));
    if (emp) moveEmployee(emp, toPositionId);
    setDragging(null);
    setDragOver(null);
  }

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
        Sleep medewerkers naar een positie om ze in te delen. Wijzigingen worden direct opgeslagen.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: `190px repeat(${teams.length}, minmax(190px, 1fr))`, gap: "1rem", overflowX: "auto" }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: "0.875rem", padding: "0.5rem", background: "var(--rvo-color-grijs-200)", borderRadius: "4px 4px 0 0" }}>
            Niet ingedeeld ({unassigned.length})
          </div>
          <div
            onDragOver={e => onDragOver(e, "__unassigned__")}
            onDragLeave={onDragLeave}
            onDrop={e => onDrop(e, null)}
            style={{
              minHeight: "80px",
              padding: "0.5rem",
              background: dragOver === "__unassigned__" && dragging ? "var(--rvo-color-hemelblauw-100)" : "var(--rvo-color-grijs-50)",
              border: dragOver === "__unassigned__" && dragging ? "2px dashed var(--rvo-color-hemelblauw-600)" : "2px dashed transparent",
              borderRadius: "0 0 4px 4px",
              display: "flex",
              flexDirection: "column",
              gap: "0.375rem",
              transition: "background 0.1s, border 0.1s",
            }}
          >
            {unassigned.length === 0
              ? <span style={{ color: "var(--rvo-color-grijs-400)", fontSize: "0.8125rem", padding: "0.5rem 0.25rem" }}>Alle medewerkers zijn ingedeeld</span>
              : unassigned.map(emp => (
                  <EmployeeCard
                    key={emp.id}
                    emp={emp}
                    isDragging={dragging === emp.id}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                  />
                ))}
            {dragOver === "__unassigned__" && dragging && (
              <div style={{ textAlign: "center", color: "var(--rvo-color-hemelblauw-600)", fontSize: "0.8125rem", padding: "0.25rem" }}>
                Loslaten om uit positie te verwijderen
              </div>
            )}
          </div>
        </div>

        {teams.map(team => {
          const teamPositions = getTeamPositions(team.id);
          const filled = teamPositions.filter(p => p.status === "filled").length;
          return (
            <div key={team.id}>
              <div style={{ fontWeight: 600, fontSize: "0.875rem", padding: "0.5rem", background: "var(--rvo-color-hemelblauw-100)", borderRadius: "4px 4px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>
                  {team.name}
                  <span style={{ marginLeft: "0.25rem", fontWeight: 400, color: "var(--rvo-color-grijs-600)" }}>({filled}/{teamPositions.length})</span>
                </span>
                <Link href={`/teams/${team.id}`} style={{ fontSize: "0.75rem", color: "var(--rvo-color-hemelblauw-700)" }}>→</Link>
              </div>
              <div style={{ padding: "0.5rem", background: "var(--rvo-color-grijs-50)", borderRadius: "0 0 4px 4px", minHeight: "80px" }}>
                {teamPositions.length === 0
                  ? <span style={{ color: "var(--rvo-color-grijs-400)", fontSize: "0.8125rem" }}>Geen posities</span>
                  : teamPositions.map(pos => (
                      <PositionCard
                        key={pos.id}
                        pos={pos}
                        assignedEmp={pos.activeEmployeeId ? employees.find(e => e.id === pos.activeEmployeeId) ?? null : null}
                        isOver={dragOver === pos.id && dragging !== null}
                        draggingId={dragging}
                        onDragOver={onDragOver}
                        onDragLeave={onDragLeave}
                        onDrop={onDrop}
                        onDragStart={onDragStart}
                        onDragEnd={onDragEnd}
                      />
                    ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
