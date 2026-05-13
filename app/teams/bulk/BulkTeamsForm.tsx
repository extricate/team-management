"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Heading } from "@rijkshuisstijl-community/components-react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

interface Org { id: string; name: string; }

interface Results { created: number; skipped: number; errors: string[]; }

interface Props { orgs: Org[]; defaultOrganisationId?: string | null; }

export function BulkTeamsForm({ orgs, defaultOrganisationId }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Results | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const organisationId = fd.get("organisationId") as string;
    const rawText = fd.get("names") as string;

    const names = rawText
      .split("\n")
      .map(n => n.trim())
      .filter(n => n.length > 0);

    if (names.length === 0) {
      setError("Voer minimaal één teamnaam in.");
      return;
    }

    setSaving(true);
    setError(null);
    setResults(null);

    try {
      const res = await fetch("/api/teams/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organisationId, names }),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Er is een fout opgetreden.");
        return;
      }

      const { data } = await res.json();
      setResults(data);
      formRef.current?.reset();
    } catch {
      setError("Er is een verbindingsfout opgetreden.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="form-page">
      <Breadcrumbs crumbs={[{ label: "Teams", href: "/teams" }, { label: "Snel toevoegen" }]} />
      <Heading level={1} style={{ marginBottom: "1.5rem" }}>Teams snel toevoegen</Heading>

      {error && (
        <div role="alert" className="form-alert">
          <p>{error}</p>
        </div>
      )}

      {results && (
        <div role="status" className="form-alert form-alert--success">
          <p>
            {results.created === 1 ? "1 team aangemaakt" : `${results.created} teams aangemaakt`}
            {results.skipped > 0 && `, ${results.skipped} overgeslagen (bestaan al)`}
          </p>
          {results.errors.length > 0 && (
            <ul style={{ margin: "0.5rem 0 0 0", paddingLeft: "1.25rem" }}>
              {results.errors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          )}
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="organisationId" className="utrecht-form-label">
            Organisatie <span className="form-required" aria-label="verplicht">*</span>
          </label>
          <select id="organisationId" name="organisationId" className="utrecht-select" required defaultValue={defaultOrganisationId ?? ""}>
            <option value="">— Kies een organisatie —</option>
            {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="names" className="utrecht-form-label">
            Teamnamen <span className="form-required" aria-label="verplicht">*</span>
          </label>
          <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.875rem", color: "var(--rvo-color-grijs-600)" }}>
            Één teamnaam per regel. Bestaande teams worden overgeslagen.
          </p>
          <textarea
            id="names"
            name="names"
            className="utrecht-textarea"
            rows={10}
            required
            autoFocus
            placeholder={"Team A\nTeam B\nTeam C"}
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="utrecht-button utrecht-button--primary-action" disabled={saving}>
            {saving ? "Toevoegen..." : "Teams toevoegen"}
          </button>
          <Link href="/teams" className="utrecht-button utrecht-button--secondary-action">
            Annuleren
          </Link>
        </div>
      </form>
    </div>
  );
}
