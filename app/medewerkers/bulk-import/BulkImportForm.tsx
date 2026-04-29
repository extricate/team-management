"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Heading } from "@rijkshuisstijl-community/components-react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

interface ImportResults {
  created: number;
  skipped: number;
  errors: string[];
}

const CSV_TEMPLATE = "voornaam,tussenvoegsel,achternaam,organisatie\nJan,,Jansen,Mijn Organisatie\nMarie,van der,Berg,Mijn Organisatie\n";

function downloadTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "medewerkers-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function parseCsvPreview(text: string): { headers: string[]; rows: string[][] } | null {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return null;
  const parse = (line: string) => line.split(",").map(f => f.replace(/^"|"$/g, "").trim());
  return { headers: parse(lines[0]), rows: lines.slice(1, 6).map(parse) };
}

export function BulkImportForm() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<ImportResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setResults(null);
    setError(null);
    if (!f) { setPreview(null); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      setPreview(parseCsvPreview(text));
    };
    reader.readAsText(f, "utf-8");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setSubmitting(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/employees/bulk", { method: "POST", body: fd });
      const body = await res.json();
      if (!res.ok) { setError(body.error ?? "Er is een fout opgetreden."); return; }
      setResults(body.data);
      setFile(null);
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      setError("Er is een verbindingsfout opgetreden.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="form-page">
      <Breadcrumbs crumbs={[{ label: "Medewerkers", href: "/medewerkers" }, { label: "Bulk importeren" }]} />
      <Heading level={1} style={{ marginBottom: "0.5rem" }}>Medewerkers bulk importeren</Heading>
      <p style={{ marginBottom: "2rem", color: "var(--rvo-color-grijs-600)" }}>
        Upload een CSV-bestand om meerdere medewerkers tegelijk toe te voegen. Bestaande medewerkers (zelfde voor- en achternaam binnen dezelfde organisatie) worden overgeslagen.
      </p>

      <section style={{ marginBottom: "2rem", padding: "1.25rem", background: "var(--rvo-color-grijs-100, #f5f5f5)", borderRadius: "4px" }}>
        <strong style={{ display: "block", marginBottom: "0.5rem" }}>CSV-formaat</strong>
        <p style={{ fontSize: "0.875rem", marginBottom: "0.75rem", color: "var(--rvo-color-grijs-700)" }}>
          Vereiste kolommen: <code>voornaam</code>, <code>achternaam</code>, <code>organisatie</code>. Optioneel: <code>tussenvoegsel</code>.
          De kolom <code>organisatie</code> moet overeenkomen met een bestaande organisatienaam.
        </p>
        <button type="button" onClick={downloadTemplate} className="utrecht-button utrecht-button--secondary-action" style={{ fontSize: "0.875rem" }}>
          Download voorbeeldbestand
        </button>
      </section>

      {error && (
        <div role="alert" className="form-alert" style={{ marginBottom: "1.5rem" }}>
          <p>{error}</p>
        </div>
      )}

      {results && (
        <div role="status" style={{ marginBottom: "2rem", padding: "1.25rem", background: "#f0faf0", border: "1px solid #b8e0b8", borderRadius: "4px" }}>
          <strong style={{ display: "block", marginBottom: "0.5rem" }}>Import voltooid</strong>
          <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.9rem" }}>
            <li><strong>{results.created}</strong> medewerker{results.created !== 1 ? "s" : ""} aangemaakt</li>
            <li><strong>{results.skipped}</strong> overgeslagen (al aanwezig)</li>
            {results.errors.length > 0 && (
              <li style={{ color: "#c00" }}>
                <strong>{results.errors.length}</strong> fout{results.errors.length !== 1 ? "en" : ""}:
                <ul style={{ marginTop: "0.25rem" }}>
                  {results.errors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </li>
            )}
          </ul>
          <Link href="/medewerkers" className="utrecht-link" style={{ display: "inline-block", marginTop: "1rem", fontSize: "0.875rem" }}>
            Bekijk alle medewerkers →
          </Link>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="csvFile" className="utrecht-form-label">
            CSV-bestand <span className="form-required" aria-label="verplicht">*</span>
          </label>
          <input
            ref={fileInputRef}
            id="csvFile"
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="utrecht-textbox"
            style={{ padding: "0.375rem" }}
            required
          />
        </div>

        {preview && (
          <div style={{ marginBottom: "1.5rem" }}>
            <p style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem" }}>Voorbeeld (eerste 5 rijen):</p>
            <div style={{ overflowX: "auto" }}>
              <table className="utrecht-table" style={{ fontSize: "0.825rem" }}>
                <thead className="utrecht-table__header">
                  <tr className="utrecht-table__row">
                    {preview.headers.map(h => <th key={h} className="utrecht-table__header-cell">{h}</th>)}
                  </tr>
                </thead>
                <tbody className="utrecht-table__body">
                  {preview.rows.map((row, i) => (
                    <tr key={i} className="utrecht-table__row">
                      {row.map((cell, j) => <td key={j} className="utrecht-table__cell">{cell || <span style={{ color: "#aaa" }}>—</span>}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="form-actions">
          <button type="submit" className="utrecht-button utrecht-button--primary-action" disabled={!file || submitting}>
            {submitting ? "Importeren…" : "Importeer medewerkers"}
          </button>
          <Link href="/medewerkers" className="utrecht-button utrecht-button--secondary-action">Annuleren</Link>
        </div>
      </form>
    </div>
  );
}
