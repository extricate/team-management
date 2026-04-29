"use client";

import { useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatFullName, formatDate } from "@/lib/utils";

interface Membership {
  id: string;
  status: string;
  startDate: Date | string | null;
  endDate: Date | string | null;
  employee: { id: string; firstName: string; prefixName: string | null; lastName: string };
}

interface Props {
  teamId: string;
  memberships: Membership[];
}

export function FilterableTeamMembersTable({ teamId, memberships }: Props) {
  const [showInactive, setShowInactive] = useState(false);

  const visible = showInactive ? memberships : memberships.filter(m => m.status === "active");
  const inactiveCount = memberships.filter(m => m.status !== "active").length;

  return (
    <>
      <table className="utrecht-table">
        <thead className="utrecht-table__header">
          <tr className="utrecht-table__row">
            <th className="utrecht-table__header-cell">Naam</th>
            <th className="utrecht-table__header-cell">Status</th>
            <th className="utrecht-table__header-cell">Startdatum</th>
            <th className="utrecht-table__header-cell">Einddatum</th>
            <th className="utrecht-table__header-cell"></th>
          </tr>
        </thead>
        <tbody className="utrecht-table__body">
          {visible.length === 0 && (
            <tr className="utrecht-table__row">
              <td className="utrecht-table__cell" colSpan={5} style={{ textAlign: "center", padding: "1.5rem", color: "var(--rvo-color-grijs-600)" }}>
                Geen actieve leden.
              </td>
            </tr>
          )}
          {visible.map((m) => (
            <tr key={m.id} className="utrecht-table__row">
              <td className="utrecht-table__cell">
                <Link href={`/medewerkers/${m.employee.id}`} className="utrecht-link">
                  {formatFullName(m.employee)}
                </Link>
              </td>
              <td className="utrecht-table__cell">
                <StatusBadge label={m.status} color={m.status === "active" ? "green" : "grey"} />
              </td>
              <td className="utrecht-table__cell" style={{ whiteSpace: "nowrap" }}>{formatDate(m.startDate)}</td>
              <td className="utrecht-table__cell" style={{ whiteSpace: "nowrap" }}>{formatDate(m.endDate)}</td>
              <td className="utrecht-table__cell" style={{ whiteSpace: "nowrap" }}>
                <Link href={`/teams/${teamId}/leden/${m.id}/bewerken`} className="utrecht-link" style={{ fontSize: "0.875rem" }}>Bewerken</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {inactiveCount > 0 && (
        <div style={{ marginTop: "0.75rem" }}>
          <button
            type="button"
            onClick={() => setShowInactive(v => !v)}
            className="utrecht-button utrecht-button--subtle"
            style={{ fontSize: "0.875rem" }}
          >
            {showInactive ? "Verberg inactieve leden" : `Toon ${inactiveCount} ${inactiveCount === 1 ? "inactief lid" : "inactieve leden"}`}
          </button>
        </div>
      )}
    </>
  );
}
