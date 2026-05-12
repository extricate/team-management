"use client";

import { useRef, useState, useId } from "react";
import { useRouter } from "next/navigation";

interface Team { id: string; name: string; }

interface Props {
  positionId: string;
  positionName: string;
  currentTeamId: string;
  activeCouplingId: string;
}

export function TransferPositionButton({ positionId, positionName, currentTeamId, activeCouplingId }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const titleId = useId();

  async function open() {
    setError(null);
    setSelectedTeamId("");
    setTeamsLoading(true);
    dialogRef.current?.showModal();
    try {
      const res = await fetch("/api/teams");
      const { data } = await res.json();
      setTeams((data ?? []).filter((t: Team) => t.id !== currentTeamId));
    } finally {
      setTeamsLoading(false);
    }
  }

  function close() {
    if (loading) return;
    dialogRef.current?.close();
    setError(null);
  }

  async function handleConfirm() {
    if (!selectedTeamId) return;
    setLoading(true);
    setError(null);
    try {
      // End the current coupling
      const endRes = await fetch(`/api/team-position-couplings/${activeCouplingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endDate: new Date().toISOString() }),
      });
      if (!endRes.ok) {
        const body = await endRes.json().catch(() => ({}));
        setError(body.error ?? "Koppeling beëindigen mislukt.");
        setLoading(false);
        return;
      }

      // Create new coupling to target team
      const newRes = await fetch("/api/team-position-couplings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: selectedTeamId, positionId, startDate: new Date().toISOString() }),
      });
      if (!newRes.ok) {
        const body = await newRes.json().catch(() => ({}));
        setError(body.error ?? "Nieuwe koppeling aanmaken mislukt.");
        setLoading(false);
        return;
      }

      dialogRef.current?.close();
      router.push(`/teams/${selectedTeamId}`);
    } catch {
      setError("Er is een verbindingsfout opgetreden.");
      setLoading(false);
    }
  }

  return (
    <>
      <button type="button" className="utrecht-button utrecht-button--secondary-action" style={{ fontSize: "0.8125rem", padding: "0.25rem 0.75rem" }} onClick={open}>
        Overdragen
      </button>
      <dialog ref={dialogRef} className="confirm-dialog" aria-labelledby={titleId}>
        <div className="confirm-dialog__content">
          <p id={titleId} className="confirm-dialog__title">Positie overdragen</p>
          <p className="confirm-dialog__body">
            Selecteer het team waarnaar <strong>{positionName}</strong> overgedragen moet worden.
          </p>
          {teamsLoading ? (
            <p style={{ fontSize: "0.875rem", color: "var(--rvo-color-grijs-600)" }}>Laden…</p>
          ) : (
            <div className="form-field" style={{ marginBottom: "1rem" }}>
              <label htmlFor="transfer-team" className="utrecht-form-label">Team</label>
              <select
                id="transfer-team"
                className="utrecht-select"
                value={selectedTeamId}
                onChange={e => setSelectedTeamId(e.target.value)}
              >
                <option value="">— Kies een team —</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}
          {error && (
            <div className="form-alert" role="alert">
              <p>{error}</p>
            </div>
          )}
          <div className="confirm-dialog__actions">
            <button
              type="button"
              className="utrecht-button utrecht-button--secondary-action"
              onClick={close}
              disabled={loading}
            >
              Annuleren
            </button>
            <button
              type="button"
              className="utrecht-button utrecht-button--primary-action"
              onClick={handleConfirm}
              disabled={loading || !selectedTeamId || teamsLoading}
            >
              {loading ? "Bezig…" : "Overdragen"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
