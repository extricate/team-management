"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heading, Paragraph } from "@rijkshuisstijl-community/components-react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface Position {
  id: string;
  type: string;
  opfType: string | null;
  positionCode: string | null;
  schaal: string | null;
  status: string;
  teamCouplings: Array<{ endDate: string | null }>;
}

const STATUS_LABELS: Record<string, string> = {
  gepland: "Gepland",
  gewenst: "Gewenst",
  toegezegd: "Toegezegd",
  open: "Open",
  gevuld: "Bezet",
  gesloten: "Gesloten",
};

const STATUS_COLORS: Record<string, "green" | "orange" | "blue" | "grey"> = {
  gevuld: "green",
  open: "orange",
  toegezegd: "blue",
};

interface Props {
  teamId: string;
  teamName: string;
  orgId: string;
  availablePositions: Position[];
}

export function KoppelenPositieForm({ teamId, teamName, availablePositions }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null); // positionId being coupled
  const [error, setError] = useState<string | null>(null);
  const [coupled, setCoupled] = useState<Set<string>>(new Set());

  async function handleCouple(positionId: string) {
    setLoading(positionId);
    setError(null);
    try {
      const res = await fetch("/api/team-position-couplings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          positionId,
          startDate: new Date().toISOString(),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Koppelen mislukt.");
        return;
      }
      setCoupled(prev => new Set([...prev, positionId]));
      router.refresh();
    } catch {
      setError("Er is een verbindingsfout opgetreden.");
    } finally {
      setLoading(null);
    }
  }

  const uncoupled = availablePositions.filter(p => !coupled.has(p.id));

  return (
    <div>
      <Breadcrumbs crumbs={[
        { label: "Teams", href: "/teams" },
        { label: teamName, href: `/teams/${teamId}` },
        { label: "Positie koppelen" },
      ]} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <div>
          <Heading level={1} style={{ margin: "0 0 0.25rem" }}>Bestaande positie koppelen</Heading>
          <Paragraph style={{ margin: 0, color: "var(--rvo-color-grijs-600)" }}>
            Selecteer een ongekoppelde positie uit de organisatie om aan <strong>{teamName}</strong> te koppelen.
          </Paragraph>
        </div>
        <Link href={`/teams/${teamId}`} className="utrecht-button utrecht-button--secondary-action">
          Terug
        </Link>
      </div>

      {error && (
        <div role="alert" className="form-alert" style={{ marginBottom: "1rem" }}>
          <p>{error}</p>
        </div>
      )}

      {uncoupled.length === 0 ? (
        <Paragraph style={{ color: "var(--rvo-color-grijs-600)" }}>
          Geen ongekoppelde posities beschikbaar in deze organisatie.{" "}
          <Link href={`/teams/${teamId}/posities/nieuw`} className="utrecht-link">Maak een nieuwe positie aan →</Link>
        </Paragraph>
      ) : (
        <table className="utrecht-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead className="utrecht-table__header">
            <tr className="utrecht-table__row">
              <th className="utrecht-table__header-cell">Functienaam</th>
              <th className="utrecht-table__header-cell">OPF-type</th>
              <th className="utrecht-table__header-cell">Schaal</th>
              <th className="utrecht-table__header-cell">Status</th>
              <th className="utrecht-table__header-cell" />
            </tr>
          </thead>
          <tbody className="utrecht-table__body">
            {uncoupled.map(pos => (
              <tr key={pos.id} className="utrecht-table__row">
                <td className="utrecht-table__cell">
                  <strong>{pos.type}</strong>
                  {pos.positionCode && (
                    <span style={{ marginLeft: "0.375rem", color: "var(--rvo-color-grijs-500)", fontSize: "0.8125rem" }}>
                      {pos.positionCode}
                    </span>
                  )}
                </td>
                <td className="utrecht-table__cell">
                  {pos.opfType ? <code>{pos.opfType}</code> : "—"}
                </td>
                <td className="utrecht-table__cell">{pos.schaal ?? "—"}</td>
                <td className="utrecht-table__cell">
                  <StatusBadge
                    label={STATUS_LABELS[pos.status] ?? pos.status}
                    color={STATUS_COLORS[pos.status] ?? "grey"}
                  />
                </td>
                <td className="utrecht-table__cell" style={{ textAlign: "right" }}>
                  <button
                    type="button"
                    className="utrecht-button utrecht-button--primary-action"
                    style={{ fontSize: "0.8125rem", padding: "0.25rem 0.75rem" }}
                    onClick={() => handleCouple(pos.id)}
                    disabled={loading === pos.id}
                  >
                    {loading === pos.id ? "Bezig…" : "Koppelen"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: "1.5rem" }}>
        <Link href={`/teams/${teamId}/posities/nieuw`} className="utrecht-link">
          + Nieuwe positie aanmaken voor dit team
        </Link>
      </div>
    </div>
  );
}
