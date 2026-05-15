"use client";

import { useRef, useState, useId } from "react";
import { useRouter } from "next/navigation";

interface Props {
  entityName: string;
  apiPath: string;
  redirectTo?: string;
  warningText?: string;
  size?: "sm";
}

export function ArchiveButton({ entityName, apiPath, redirectTo, warningText, size }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
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
      const res = await fetch(apiPath, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message ?? "Er is iets misgegaan. Probeer het opnieuw.");
        setLoading(false);
        return;
      }
      if (redirectTo) {
        router.push(redirectTo);
      }
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
        className={`utrecht-button utrecht-button--danger${size === "sm" ? " utrecht-button--sm" : ""}`}
        onClick={open}
      >
        Archiveren
      </button>
      <dialog ref={dialogRef} className="confirm-dialog" aria-labelledby={titleId}>
        <div className="confirm-dialog__content">
          <p id={titleId} className="confirm-dialog__title">Archiveren bevestigen</p>
          <p className="confirm-dialog__body">
            Weet je zeker dat je <strong>{entityName}</strong> wilt archiveren?
            {warningText && <> {warningText}</>}
          </p>
          {error && (
            <div className="form-alert" role="alert">
              <p>{error}</p>
            </div>
          )}
          <div className="confirm-dialog__actions">
            <button
              ref={cancelRef}
              autoFocus
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
              {loading ? "Bezig…" : "Archiveer"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
