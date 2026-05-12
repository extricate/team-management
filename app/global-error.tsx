"use client";

import { useEffect } from "react";
import "@rijkshuisstijl-community/font/dist/index.css";
import "@rijkshuisstijl-community/design-tokens/dist/index.css";
import "@utrecht/button-css/dist/index.css";
import "./globals.css";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="nl" className="rhc-theme">
      <body>
        <div className="page-wrapper">
          <main id="main-content" style={{ display: "flex", alignItems: "flex-start" }}>
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
                  fontFamily: '"Fira Sans", Arial, sans-serif',
                  fontSize: "1.75rem",
                  fontWeight: 700,
                  color: "var(--rvo-color-hemelblauw-700, #154273)",
                  margin: "0 0 1rem",
                  lineHeight: 1.3,
                }}
              >
                Er is een kritieke fout opgetreden
              </h1>
              <p
                style={{
                  fontFamily: '"Fira Sans", Arial, sans-serif',
                  fontSize: "1rem",
                  color: "var(--rvo-color-grijs-700, #5c5c5c)",
                  marginBottom: "2rem",
                  lineHeight: 1.6,
                }}
              >
                De applicatie heeft een onherstelbare fout ondervonden. Probeer de pagina
                opnieuw te laden.
              </p>
              {error.digest && (
                <p
                  style={{
                    fontFamily: "monospace",
                    fontSize: "0.8125rem",
                    color: "var(--rvo-color-grijs-500, #767676)",
                    marginBottom: "1.5rem",
                  }}
                >
                  Foutcode: {error.digest}
                </p>
              )}
              <button
                onClick={reset}
                className="utrecht-button utrecht-button--primary-action"
              >
                Opnieuw proberen
              </button>
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
