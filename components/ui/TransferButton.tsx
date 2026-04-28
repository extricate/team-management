"use client";

import { useRef, useState, useId } from "react";
import { useRouter } from "next/navigation";

interface Org { id: string; name: string; }

interface Props {
  sourceId: string;
  sourceName: string;
  currentOrgId: string;
}

export function TransferButton({ sourceId, sourceName, currentOrgId }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const titleId = useId();

  async function open() {
    setError(null);
    setSelectedOrgId("");
    setOrgsLoading(true);
    dialogRef.current?.showModal();
    try {
      const res = await fetch("/api/organisations");
      const { data } = await res.json();
      setOrgs((data ?? []).filter((o: Org) => o.id !== currentOrgId));
    } finally {
      setOrgsLoading(false);
    }
  }

  function close() {
    if (loading) return;
    dialogRef.current?.close();
    setError(null);
  }

  async function handleConfirm() {
    if (!selectedOrgId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/financial-sources/${sourceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organisationId: selectedOrgId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message ?? body.error ?? "Er is iets misgegaan. Probeer het opnieuw.");
        setLoading(false);
        return;
      }
      dialogRef.current?.close();
      router.refresh();
    } catch {
      setError("Er is een verbindingsfout opgetreden.");
      setLoading(false);
    }
  }

  return (
    <>
      <button type="button" className="utrecht-button utrecht-button--secondary-action" onClick={open}>
        Overdragen
      </button>
      <dialog ref={dialogRef} className="confirm-dialog" aria-labelledby={titleId}>
        <div className="confirm-dialog__content">
          <p id={titleId} className="confirm-dialog__title">Financieringsbron overdragen</p>
          <p className="confirm-dialog__body">
            Selecteer de organisatie waarnaar <strong>{sourceName}</strong> overgedragen moet worden.
          </p>
          {orgsLoading ? (
            <p style={{ fontSize: "0.875rem", color: "var(--rvo-color-grijs-600)" }}>Laden…</p>
          ) : (
            <div className="form-field" style={{ marginBottom: "1rem" }}>
              <label htmlFor="transfer-org" className="utrecht-form-label">Organisatie</label>
              <select
                id="transfer-org"
                className="utrecht-select"
                value={selectedOrgId}
                onChange={e => setSelectedOrgId(e.target.value)}
              >
                <option value="">— Kies een organisatie —</option>
                {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
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
              disabled={loading || !selectedOrgId || orgsLoading}
            >
              {loading ? "Bezig…" : "Overdragen"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
