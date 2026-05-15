"use client";

import { useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";

interface Membership {
  id: string;
  status: string;
  startDate: Date | string | null;
  endDate: Date | string | null;
  reason: string | null;
  team: { id: string; name: string };
}

interface Props {
  employeeId: string;
  memberships: Membership[];
}

export function FilterableMembershipsTable({ employeeId: _employeeId, memberships }: Props) {
  const [showInactive, setShowInactive] = useState(false);

  const visible = showInactive ? memberships : memberships.filter(m => m.status === "active");
  const inactiveCount = memberships.filter(m => m.status !== "active").length;

  return (
    <>
      <table className="utrecht-table">
        <thead className="utrecht-table__header">
          <tr className="utrecht-table__row">
            <th className="utrecht-table__header-cell">Team</th>
            <th className="utrecht-table__header-cell">Status</th>
            <th className="utrecht-table__header-cell">Van</th>
            <th className="utrecht-table__header-cell">Tot</th>
            <th className="utrecht-table__header-cell">Reden</th>
            <th className="utrecht-table__header-cell"></th>
          </tr>
        </thead>
        <tbody className="utrecht-table__body">
          {visible.length === 0 && (
            <tr className="utrecht-table__row">
              <td className="utrecht-table__cell" colSpan={6} style={{ textAlign: "center", padding: "1.5rem", color: "var(--rvo-color-grijs-600)" }}>
                Geen actieve teamlidmaatschappen.
              </td>
            </tr>
          )}
          {visible.map((m) => (
            <tr key={m.id} className="utrecht-table__row">
              <td className="utrecht-table__cell">
                <Link href={`/teams/${m.team.id}`} className="utrecht-link">{m.team.name}</Link>
              </td>
              <td className="utrecht-table__cell">
                <StatusBadge label={m.status} color={m.status === "active" ? "green" : "grey"} />
              </td>
              <td className="utrecht-table__cell" style={{ whiteSpace: "nowrap" }}>{formatDate(m.startDate)}</td>
              <td className="utrecht-table__cell" style={{ whiteSpace: "nowrap" }}>{formatDate(m.endDate)}</td>
              <td className="utrecht-table__cell" style={{ maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={m.reason ?? undefined}>{m.reason ?? "—"}</td>
              <td className="utrecht-table__cell" style={{ whiteSpace: "nowrap" }}>
                <Link href={`/teams/${m.team.id}/leden/${m.id}/bewerken`} className="utrecht-link" style={{ fontSize: "0.875rem" }}>Bewerken</Link>
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
            {showInactive ? "Verberg inactieve lidmaatschappen" : `Toon ${inactiveCount} ${inactiveCount === 1 ? "inactief lidmaatschap" : "inactieve lidmaatschappen"}`}
          </button>
        </div>
      )}
    </>
  );
}
