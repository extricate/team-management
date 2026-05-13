"use client";

import Link from "next/link";
import { useRef, useState, useEffect, useId } from "react";
import { useRouter } from "next/navigation";

interface Team {
  id: string;
  name: string;
}

interface Props {
  positionId: string;
  positionType: string;
  teamId: string;
  couplingId: string;
  financierenHref: string;
  bewerkenHref: string;
}

type ActiveDialog = "transfer" | "decouple" | "archive" | null;

export function PositionActionsMenu({
  positionId,
  positionType,
  teamId,
  couplingId,
  financierenHref,
  bewerkenHref,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);

  // Transfer-specific state
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState("");

  // Shared async state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const transferDialogRef = useRef<HTMLDialogElement>(null);
  const decoupleDialogRef = useRef<HTMLDialogElement>(null);
  const archiveDialogRef = useRef<HTMLDialogElement>(null);

  const transferTitleId = useId();
  const decoupleTitleId = useId();
  const archiveTitleId = useId();

  // Close dropdown on outside click or Escape
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function openDialog(dialog: NonNullable<ActiveDialog>) {
    setOpen(false);
    setError(null);
    setLoading(false);
    setActiveDialog(dialog);

    if (dialog === "transfer") {
      setSelectedTeamId("");
      setTeamsLoading(true);
      transferDialogRef.current?.showModal();
      fetch("/api/teams")
        .then(r => r.json())
        .then(({ data }) => setTeams((data ?? []).filter((t: Team) => t.id !== teamId)))
        .finally(() => setTeamsLoading(false));
    } else if (dialog === "decouple") {
      decoupleDialogRef.current?.showModal();
    } else {
      archiveDialogRef.current?.showModal();
    }
  }

  function closeDialog() {
    if (loading) return;
    transferDialogRef.current?.close();
    decoupleDialogRef.current?.close();
    archiveDialogRef.current?.close();
    setActiveDialog(null);
    setError(null);
  }

  async function handleTransfer() {
    if (!selectedTeamId) return;
    setLoading(true);
    setError(null);
    try {
      const endRes = await fetch(`/api/team-position-couplings/${couplingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endDate: new Date().toISOString() }),
      });
      if (!endRes.ok) {
        setError((await endRes.json().catch(() => ({}))).error ?? "Koppeling beëindigen mislukt.");
        setLoading(false);
        return;
      }
      const newRes = await fetch("/api/team-position-couplings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: selectedTeamId, positionId, startDate: new Date().toISOString() }),
      });
      if (!newRes.ok) {
        setError((await newRes.json().catch(() => ({}))).error ?? "Nieuwe koppeling aanmaken mislukt.");
        setLoading(false);
        return;
      }
      transferDialogRef.current?.close();
      router.push(`/teams/${selectedTeamId}`);
    } catch {
      setError("Er is een verbindingsfout opgetreden.");
      setLoading(false);
    }
  }

  async function handleDecouple() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/team-position-couplings/${couplingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endDate: new Date().toISOString() }),
      });
      if (!res.ok) {
        setError((await res.json().catch(() => ({}))).error ?? "Ontkoppelen mislukt.");
        setLoading(false);
        return;
      }
      decoupleDialogRef.current?.close();
      router.refresh();
    } catch {
      setError("Er is een verbindingsfout opgetreden.");
      setLoading(false);
    }
  }

  async function handleArchive() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/positions/${positionId}`, { method: "DELETE" });
      if (!res.ok) {
        setError((await res.json().catch(() => ({}))).message ?? "Er is iets misgegaan.");
        setLoading(false);
        return;
      }
      archiveDialogRef.current?.close();
      router.refresh();
    } catch {
      setError("Er is iets misgegaan. Probeer het opnieuw.");
      setLoading(false);
    }
  }

  return (
    <>
      <div ref={menuRef} style={{ position: "relative" }}>
        <button
          type="button"
          className="actions-menu__trigger"
          onClick={() => setOpen(prev => !prev)}
          aria-label={`Acties voor ${positionType}`}
          aria-expanded={open}
          aria-haspopup="menu"
        >
          {/* Kebab icon — three dots, inline SVG for font-independence */}
          <svg width="4" height="16" viewBox="0 0 4 16" fill="currentColor" aria-hidden="true">
            <circle cx="2" cy="2"  r="1.5" />
            <circle cx="2" cy="8"  r="1.5" />
            <circle cx="2" cy="14" r="1.5" />
          </svg>
        </button>

        {open && (
          <div className="actions-menu__dropdown" role="menu">
            <Link
              href={financierenHref}
              className="actions-menu__item"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              Financieren
            </Link>
            <Link
              href={bewerkenHref}
              className="actions-menu__item"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              Bewerken
            </Link>
            <div className="actions-menu__divider" role="separator" />
            <button
              type="button"
              className="actions-menu__item"
              role="menuitem"
              onClick={() => openDialog("transfer")}
            >
              Overdragen
            </button>
            <button
              type="button"
              className="actions-menu__item actions-menu__item--danger"
              role="menuitem"
              onClick={() => openDialog("decouple")}
            >
              Ontkoppelen
            </button>
            <button
              type="button"
              className="actions-menu__item actions-menu__item--danger"
              role="menuitem"
              onClick={() => openDialog("archive")}
            >
              Archiveren
            </button>
          </div>
        )}
      </div>

      {/* Transfer dialog */}
      <dialog ref={transferDialogRef} className="confirm-dialog" aria-labelledby={transferTitleId}>
        <div className="confirm-dialog__content">
          <p id={transferTitleId} className="confirm-dialog__title">Positie overdragen</p>
          <p className="confirm-dialog__body">
            Selecteer het team waarnaar <strong>{positionType}</strong> overgedragen moet worden.
          </p>
          {teamsLoading ? (
            <p style={{ fontSize: "0.875rem", color: "var(--rvo-color-grijs-600, #5a5a5a)" }}>Laden…</p>
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
          {activeDialog === "transfer" && error && (
            <div className="form-alert" role="alert"><p>{error}</p></div>
          )}
          <div className="confirm-dialog__actions">
            <button type="button" className="utrecht-button utrecht-button--secondary-action" onClick={closeDialog} disabled={loading}>
              Annuleren
            </button>
            <button type="button" className="utrecht-button utrecht-button--primary-action" onClick={handleTransfer} disabled={loading || !selectedTeamId || teamsLoading}>
              {loading ? "Bezig…" : "Overdragen"}
            </button>
          </div>
        </div>
      </dialog>

      {/* Decouple dialog */}
      <dialog ref={decoupleDialogRef} className="confirm-dialog" aria-labelledby={decoupleTitleId}>
        <div className="confirm-dialog__content">
          <p id={decoupleTitleId} className="confirm-dialog__title">Positie ontkoppelen</p>
          <p className="confirm-dialog__body">
            Weet je zeker dat je <strong>{positionType}</strong> wilt ontkoppelen van dit team?
            De positie blijft bestaan in de organisatie en kan later opnieuw worden gekoppeld.
          </p>
          {activeDialog === "decouple" && error && (
            <div className="form-alert" role="alert"><p>{error}</p></div>
          )}
          <div className="confirm-dialog__actions">
            <button type="button" className="utrecht-button utrecht-button--secondary-action" onClick={closeDialog} disabled={loading}>
              Annuleren
            </button>
            <button type="button" className="utrecht-button utrecht-button--danger" onClick={handleDecouple} disabled={loading}>
              {loading ? "Bezig…" : "Ontkoppelen"}
            </button>
          </div>
        </div>
      </dialog>

      {/* Archive dialog */}
      <dialog ref={archiveDialogRef} className="confirm-dialog" aria-labelledby={archiveTitleId}>
        <div className="confirm-dialog__content">
          <p id={archiveTitleId} className="confirm-dialog__title">Archiveren bevestigen</p>
          <p className="confirm-dialog__body">
            Weet je zeker dat je <strong>{positionType}</strong> wilt archiveren?
            Actieve toewijzingen worden afgesloten.
          </p>
          {activeDialog === "archive" && error && (
            <div className="form-alert" role="alert"><p>{error}</p></div>
          )}
          <div className="confirm-dialog__actions">
            {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
            <button autoFocus type="button" className="utrecht-button utrecht-button--secondary-action" onClick={closeDialog} disabled={loading}>
              Annuleren
            </button>
            <button type="button" className="utrecht-button utrecht-button--danger" onClick={handleArchive} disabled={loading}>
              {loading ? "Bezig…" : "Archiveer"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
