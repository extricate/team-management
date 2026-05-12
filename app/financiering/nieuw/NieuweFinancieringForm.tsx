"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heading } from "@rijkshuisstijl-community/components-react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

interface Org { id: string; name: string; }

interface Props { orgs: Org[]; defaultOrganisationId?: string | null; }

export function NieuweFinancieringForm({ orgs, defaultOrganisationId }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/financial-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organisationId: fd.get("organisationId"),
          projectId: fd.get("projectId"),
          name: fd.get("name"),
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Er is een fout opgetreden.");
        return;
      }
      const { data } = await res.json();
      router.push(`/financiering/${data.id}`);
    } catch {
      setError("Er is een verbindingsfout opgetreden.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="form-page">
      <Breadcrumbs crumbs={[{ label: "Financiering", href: "/financiering" }, { label: "Nieuwe financieringsbron" }]} />
      <Heading level={1} style={{ marginBottom: "1.5rem" }}>Nieuwe financieringsbron</Heading>

      {error && (
        <div role="alert" className="form-alert">
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
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
          <label htmlFor="projectId" className="utrecht-form-label">
            Project ID <span className="form-required" aria-label="verplicht">*</span>
          </label>
          <input id="projectId" name="projectId" type="text" className="utrecht-textbox" required maxLength={100} autoFocus
            placeholder="bijv. PRJ-2025-042" />
          <p className="form-hint">Het interne projectnummer of begrotingscode.</p>
        </div>

        <div className="form-field">
          <label htmlFor="name" className="utrecht-form-label">
            Naam <span className="form-required" aria-label="verplicht">*</span>
          </label>
          <input id="name" name="name" type="text" className="utrecht-textbox" required maxLength={200}
            placeholder="bijv. Programmabudget 2025 – Team A" />
        </div>

        <div className="form-actions">
          <button type="submit" className="utrecht-button utrecht-button--primary-action" disabled={saving}>
            {saving ? "Opslaan..." : "Financieringsbron aanmaken"}
          </button>
          <Link href="/financiering" className="utrecht-button utrecht-button--secondary-action">
            Annuleren
          </Link>
        </div>
      </form>
    </div>
  );
}
