"use client";

import { useEffect } from "react";
import Link from "next/link";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div style={{ maxWidth: "640px" }}>
      <div
        style={{
          display: "inline-block",
          background: "var(--rvo-color-rood-50, #fdf2f2)",
          border: "1px solid var(--rvo-color-rood-200, #f5c2c2)",
          borderRadius: "4px",
          padding: "0.375rem 0.75rem",
          fontSize: "0.875rem",
          fontWeight: 600,
          color: "var(--rvo-color-rood-700, #c0392b)",
          marginBottom: "1.25rem",
        }}
      >
        500
      </div>
      <h1
        style={{
          fontFamily: "inherit",
          fontSize: "1.75rem",
          fontWeight: 700,
          color: "var(--rvo-color-hemelblauw-700, #154273)",
          margin: "0 0 1rem",
          lineHeight: 1.3,
        }}
      >
        Er is een fout opgetreden
      </h1>
      <p
        style={{
          fontFamily: "inherit",
          fontSize: "1rem",
          color: "var(--rvo-color-grijs-700)",
          marginBottom: "2rem",
          lineHeight: 1.6,
        }}
      >
        Er is een onverwachte fout opgetreden. Probeer de pagina opnieuw te laden, of ga
        terug naar het dashboard.
      </p>
      {error.digest && (
        <p
          style={{
            fontFamily: "monospace",
            fontSize: "0.8125rem",
            color: "var(--rvo-color-grijs-500)",
            marginBottom: "1.5rem",
          }}
        >
          Foutcode: {error.digest}
        </p>
      )}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <button
          onClick={reset}
          className="utrecht-button utrecht-button--primary-action"
        >
          Opnieuw proberen
        </button>
        <Link href="/dashboard" className="utrecht-button utrecht-button--secondary-action">
          Naar dashboard
        </Link>
      </div>
    </div>
  );
}
