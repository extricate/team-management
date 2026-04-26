"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heading } from "@rijkshuisstijl-community/components-react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

const TYPE_OPTIONS = ["PERSEX", "MATEX", "Investeringen"] as const;
type FinancialTypeCategory = typeof TYPE_OPTIONS[number];

interface ExistingType { type: string; year: number; }

interface Props {
  sourceId: string;
  sourceName: string;
  existingTypes: ExistingType[];
}

export function NewTypeForm({ sourceId, sourceName, existingTypes }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Build a set of already-existing type+year combos for the duplicate warning.
  const existingKeys = new Set(existingTypes.map(t => `${t.type}-${t.year}`));

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 2 + i);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const type = fd.get("type") as FinancialTypeCategory;
    const year = parseInt(fd.get("year") as string, 10);

    if (existingKeys.has(`${type}-${year}`)) {
      setError(`Het type ${type} voor ${year} bestaat al voor deze financieringsbron.`);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/financial-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ financialSourceId: sourceId, type, year }),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Er is een fout opgetreden.");
        return;
      }
      router.push(`/financiering/${sourceId}`);
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
        { label: sourceName, href: `/financiering/${sourceId}` },
        { label: "Nieuw type" },
      ]} />
      <Heading level={1} style={{ marginBottom: "0.5rem" }}>Financieel type toevoegen</Heading>
      <p style={{ marginBottom: "1.5rem", color: "var(--rvo-color-grijs-600)", fontSize: "0.9375rem" }}>
        Financieringsbron: <strong>{sourceName}</strong>
      </p>

      {error && (
        <div role="alert" className="form-alert">
          <p>{error}</p>
        </div>
      )}

      {existingTypes.length > 0 && (
        <div style={{ marginBottom: "1.5rem", padding: "0.875rem 1rem", background: "var(--rvo-color-hemelblauw-50)", borderRadius: "4px", fontSize: "0.875rem" }}>
          <strong style={{ display: "block", marginBottom: "0.375rem" }}>Bestaande types</strong>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
            {existingTypes.map(t => (
              <span key={`${t.type}-${t.year}`} style={{ background: "var(--rvo-color-hemelblauw-100)", color: "var(--rvo-color-hemelblauw-800)", borderRadius: "20px", padding: "0.125rem 0.625rem" }}>
                {t.type} · {t.year}
              </span>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="type" className="utrecht-form-label">
            Type <span className="form-required" aria-label="verplicht">*</span>
          </label>
          <select id="type" name="type" className="utrecht-select" required autoFocus>
            {TYPE_OPTIONS.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <p className="form-hint">
            PERSEX = personele kosten, MATEX = materiële kosten, Investeringen = investeringsbudget.
          </p>
        </div>

        <div className="form-field">
          <label htmlFor="year" className="utrecht-form-label">
            Jaar <span className="form-required" aria-label="verplicht">*</span>
          </label>
          <select id="year" name="year" className="utrecht-select" required defaultValue={currentYear}>
            {yearOptions.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <p className="form-hint">Het begrotingsjaar waarop dit type betrekking heeft.</p>
        </div>

        <div className="form-actions">
          <button type="submit" className="utrecht-button utrecht-button--primary-action" disabled={saving}>
            {saving ? "Opslaan..." : "Type toevoegen"}
          </button>
          <Link href={`/financiering/${sourceId}`} className="utrecht-button utrecht-button--secondary-action">
            Annuleren
          </Link>
        </div>
      </form>
    </div>
  );
}
