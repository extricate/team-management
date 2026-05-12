import Link from "next/link";
import { Heading, Paragraph } from "@rijkshuisstijl-community/components-react";

export default function NotFound() {
  return (
    <div style={{ maxWidth: "640px" }}>
      <div
        style={{
          display: "inline-block",
          background: "var(--rvo-color-hemelblauw-50, #eef4fb)",
          border: "1px solid var(--rvo-color-hemelblauw-100, #d3e4f5)",
          borderRadius: "4px",
          padding: "0.375rem 0.75rem",
          fontSize: "0.875rem",
          fontWeight: 600,
          color: "var(--rvo-color-hemelblauw-700, #154273)",
          marginBottom: "1.25rem",
        }}
      >
        404
      </div>
      <Heading level={1} style={{ margin: "0 0 1rem" }}>
        Pagina niet gevonden
      </Heading>
      <Paragraph style={{ marginBottom: "2rem", color: "var(--rvo-color-grijs-700)" }}>
        De pagina die u zoekt bestaat niet of is verplaatst. Controleer het adres en probeer
        het opnieuw, of ga terug naar het dashboard.
      </Paragraph>
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <Link href="/dashboard" className="utrecht-button utrecht-button--primary-action">
          Naar dashboard
        </Link>
        <Link href="/" className="utrecht-button utrecht-button--secondary-action">
          Naar startpagina
        </Link>
      </div>
    </div>
  );
}
