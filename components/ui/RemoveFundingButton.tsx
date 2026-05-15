"use client";

import { useRef, useState, useId } from "react";
import { useRouter } from "next/navigation";

interface Props {
  allocationId: string;
  sourceName: string;
}

export function RemoveFundingButton({ allocationId, sourceName }: Props) {
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
      const res = await fetch(`/api/funding-allocations/${allocationId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message ?? "Er is iets misgegaan. Probeer het opnieuw.");
        setLoading(false);
        return;
      }
      dialogRef.current?.close();
      router.refresh();
    } catch {
      setError("Er is iets misgegaan. Probeer het opnieuw.");
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        title="Financiering verwijderen"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--rvo-color-rood-600, #c0392b)",
          fontSize: "0.875rem",
          padding: "0 0.25rem",
          lineHeight: 1,
        }}
        aria-label={`Financiering van ${sourceName} verwijderen`}
      >
        ×
      </button>
      <dialog ref={dialogRef} className="confirm-dialog" aria-labelledby={titleId}>
        <div className="confirm-dialog__content">
          <p id={titleId} className="confirm-dialog__title">Financiering verwijderen</p>
          <p className="confirm-dialog__body">
            Weet je zeker dat je de financiering van <strong>{sourceName}</strong> wilt verwijderen?
            Dit kan niet ongedaan worden gemaakt.
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
              autoFocus
            >
              Annuleren
            </button>
            <button
              type="button"
              className="utrecht-button utrecht-button--danger"
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? "Bezig…" : "Verwijderen"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
