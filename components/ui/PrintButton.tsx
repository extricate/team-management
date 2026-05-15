"use client";

export function PrintButton({ label = "Afdrukken" }: { label?: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="utrecht-button utrecht-button--secondary-action"
      style={{ fontSize: "0.875rem" }}
    >
      {label}
    </button>
  );
}
