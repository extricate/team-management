"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heading } from "@rijkshuisstijl-community/components-react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import type { FinancialSource } from "@/lib/db/schema";

interface Props { source: FinancialSource & { organisation: { name: string } }; }

export function FinancieringEditForm({ source }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/financial-sources/${source.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: fd.get("projectId"),
          name: fd.get("name"),
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Er is een fout opgetreden.");
        return;
      }
      router.push(`/financiering/${source.id}`);
      router.refresh();
    } catch {
      setError("Er is een verbindingsfout opgetreden.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="form-page">
      <Breadcrumbs crumbs={[
        { label: "Financiering", href: "/financiering" },
        { label: source.name, href: `/financiering/${source.id}` },
        { label: "Bewerken" },
      ]} />
      <Heading level={1} style={{ marginBottom: "1.5rem" }}>Financieringsbron bewerken</Heading>

      <p style={{ marginBottom: "1.5rem", color: "var(--rvo-color-grijs-600)", fontSize: "0.9375rem" }}>
        Organisatie: <strong>{source.organisation.name}</strong>
      </p>

      {error && (
        <div role="alert" className="form-alert">
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="projectId" className="utrecht-form-label">
            Project ID <span className="form-required" aria-label="verplicht">*</span>
          </label>
          <input id="projectId" name="projectId" type="text" className="utrecht-textbox" required maxLength={100} defaultValue={source.projectId} autoFocus />
          <p className="form-hint">Het interne projectnummer of begrotingscode.</p>
        </div>

        <div className="form-field">
          <label htmlFor="name" className="utrecht-form-label">
            Naam <span className="form-required" aria-label="verplicht">*</span>
          </label>
          <input id="name" name="name" type="text" className="utrecht-textbox" required maxLength={200} defaultValue={source.name} />
        </div>

        <div className="form-actions">
          <button type="submit" className="utrecht-button utrecht-button--primary-action" disabled={saving}>
            {saving ? "Opslaan..." : "Wijzigingen opslaan"}
          </button>
          <Link href={`/financiering/${source.id}`} className="utrecht-button utrecht-button--secondary-action">
            Annuleren
          </Link>
        </div>
      </form>
    </div>
  );
}
