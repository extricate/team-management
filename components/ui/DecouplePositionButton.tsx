"use client";

import { useRef, useState, useId } from "react";
import { useRouter } from "next/navigation";

interface Props {
  couplingId: string;
  positionName: string;
  size?: "sm";
}

export function DecouplePositionButton({ couplingId, positionName, size }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();

  function open() {
    setError(null);
    dialogRef.current?.showModal();
  }

  function close() {
    if (loading) return;
    dialogRef.current?.close();
    setError(null);
  }

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/team-position-couplings/${couplingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endDate: new Date().toISOString() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Ontkoppelen mislukt.");
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
      <button
        type="button"
        className={`utrecht-button utrecht-button--secondary-action${size === "sm" ? " utrecht-button--sm" : ""}`}
        onClick={open}
      >
        Ontkoppelen
      </button>
      <dialog ref={dialogRef} className="confirm-dialog" aria-labelledby={titleId}>
        <div className="confirm-dialog__content">
          <p id={titleId} className="confirm-dialog__title">Positie ontkoppelen</p>
          <p className="confirm-dialog__body">
            Weet je zeker dat je <strong>{positionName}</strong> wilt ontkoppelen van dit team?
            De positie blijft bestaan in de organisatie en kan later opnieuw worden gekoppeld.
          </p>
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
              className="utrecht-button utrecht-button--danger"
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? "Bezig…" : "Ontkoppelen"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
