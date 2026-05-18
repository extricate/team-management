"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";

interface FunctieRow {
  assignment: {
    id: string;
    isPrimary: boolean;
    startDate: Date | null;
    endDate: Date | null;
    status: string;
  };
  functie: {
    id: string;
    titel: string;
    schaalCode: string | null;
  };
}

interface Props {
  rows: FunctieRow[];
  employeeId: string;
  isArchived: boolean;
}

export function MedewerkerFunctiesTable({ rows, employeeId, isArchived }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSetPrimary(assignmentId: string) {
    setBusy(assignmentId);
    setError(null);
    try {
      const res = await fetch(`/api/medewerkers/${employeeId}/functies/${assignmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPrimary: true }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Er ging iets mis.");
      } else {
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  }

  async function handleEnd(assignmentId: string) {
    if (!confirm("Weet je zeker dat je deze functietoewijzing wil beëindigen?")) return;
    setBusy(assignmentId);
    setError(null);
    try {
      const res = await fetch(`/api/medewerkers/${employeeId}/functies/${assignmentId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Er ging iets mis.");
      } else {
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  }

  if (rows.length === 0) {
    return (
      <p style={{ color: "var(--rvo-color-grijs-600)", margin: 0 }}>
        Nog geen functies toegewezen.{" "}
        {!isArchived && (
          <Link href={`/medewerkers/${employeeId}/functies/toevoegen`} className="utrecht-link">
            Functie toevoegen
          </Link>
        )}
      </p>
    );
  }

  return (
    <>
      {error && (
        <div role="alert" className="form-alert" style={{ marginBottom: "1rem" }}>
          <p>{error}</p>
        </div>
      )}
      <table className="utrecht-table">
        <thead className="utrecht-table__header">
          <tr className="utrecht-table__row">
            <th className="utrecht-table__header-cell">Functie</th>
            <th className="utrecht-table__header-cell">Schaal</th>
            <th className="utrecht-table__header-cell">Primair</th>
            <th className="utrecht-table__header-cell">Van</th>
            <th className="utrecht-table__header-cell">Tot</th>
            <th className="utrecht-table__header-cell">Status</th>
            {!isArchived && <th className="utrecht-table__header-cell">Acties</th>}
          </tr>
        </thead>
        <tbody className="utrecht-table__body">
          {rows.map(({ assignment, functie }) => (
            <tr key={assignment.id} className="utrecht-table__row">
              <td className="utrecht-table__cell" style={{ fontWeight: 600 }}>
                <Link href={`/beheer/functies/${functie.id}`} className="utrecht-link">
                  {functie.titel}
                </Link>
              </td>
              <td className="utrecht-table__cell">{functie.schaalCode ?? "—"}</td>
              <td className="utrecht-table__cell">
                {assignment.isPrimary ? (
                  <span style={{ fontWeight: 600, color: "var(--rvo-color-hemelblauw-700)" }}>Primair</span>
                ) : "—"}
              </td>
              <td className="utrecht-table__cell" style={{ whiteSpace: "nowrap" }}>
                {formatDate(assignment.startDate)}
              </td>
              <td className="utrecht-table__cell" style={{ whiteSpace: "nowrap" }}>
                {formatDate(assignment.endDate)}
              </td>
              <td className="utrecht-table__cell">
                <span style={{ color: assignment.status === "active" ? "var(--rvo-color-groen-600)" : "var(--rvo-color-grijs-600)" }}>
                  {assignment.status === "active" ? "Actief" : "Beëindigd"}
                </span>
              </td>
              {!isArchived && (
                <td className="utrecht-table__cell" style={{ whiteSpace: "nowrap" }}>
                  <span style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                    {assignment.status === "active" && !assignment.isPrimary && (
                      <button
                        className="utrecht-link"
                        style={{ fontSize: "0.875rem", background: "none", border: "none", padding: 0, cursor: "pointer" }}
                        disabled={busy === assignment.id}
                        onClick={() => handleSetPrimary(assignment.id)}
                      >
                        Primair maken
                      </button>
                    )}
                    {assignment.status === "active" && (
                      <button
                        className="utrecht-link"
                        style={{ fontSize: "0.875rem", background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--rvo-color-rood-700)" }}
                        disabled={busy === assignment.id}
                        onClick={() => handleEnd(assignment.id)}
                      >
                        Beëindigen
                      </button>
                    )}
                  </span>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
