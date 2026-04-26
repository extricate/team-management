"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heading } from "@rijkshuisstijl-community/components-react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

interface FinancialType { id: string; type: string; year: number; }

interface Props {
  sourceId: string;
  sourceName: string;
  types: FinancialType[];
}

export function NewBedragForm({ sourceId, sourceName, types }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"concept" | "released">("concept");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    setError(null);

    const effectiveDateStr = fd.get("effectiveDate") as string;
    const releaseDateStr = fd.get("releaseDate") as string;
    const amountRaw = (fd.get("amount") as string).replace(",", ".");

    try {
      const res = await fetch("/api/financial-source-amounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          financialSourceId: sourceId,
          financialTypeId: fd.get("financialTypeId") as string,
          amount: parseFloat(amountRaw),
          status: fd.get("status"),
          effectiveDate: effectiveDateStr ? new Date(effectiveDateStr).toISOString() : undefined,
          releaseDate: releaseDateStr ? new Date(releaseDateStr).toISOString() : undefined,
        }),
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
        { label: "Nieuw bedrag" },
      ]} />
      <Heading level={1} style={{ marginBottom: "1.5rem" }}>Nieuw bedrag</Heading>

      {error && (
        <div role="alert" className="form-alert">
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="financialTypeId" className="utrecht-form-label">
            Financieel type <span className="form-required" aria-label="verplicht">*</span>
          </label>
          <select id="financialTypeId" name="financialTypeId" className="utrecht-select" required autoFocus>
            {types.map(t => (
              <option key={t.id} value={t.id}>{t.type} · {t.year}</option>
            ))}
          </select>
          <p className="form-hint">PERSEX = personele kosten, MATEX = materiële kosten, Investeringen = investeringsbudget.</p>
        </div>

        <div className="form-field">
          <label htmlFor="amount" className="utrecht-form-label">
            Bedrag (€) <span className="form-required" aria-label="verplicht">*</span>
          </label>
          <input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            className="utrecht-textbox"
            required
            placeholder="0.00"
          />
        </div>

        <div className="form-field">
          <label htmlFor="status" className="utrecht-form-label">
            Status <span className="form-required" aria-label="verplicht">*</span>
          </label>
          <select
            id="status"
            name="status"
            className="utrecht-select"
            required
            value={status}
            onChange={e => setStatus(e.target.value as "concept" | "released")}
          >
            <option value="concept">Concept</option>
            <option value="released">Vrijgegeven</option>
          </select>
          <p className="form-hint">
            {status === "released"
              ? "Vrijgegeven bedragen kunnen worden gealloceerd aan posities of teams."
              : "Conceptbedragen zijn nog niet beschikbaar voor allocatie."}
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div className="form-field">
            <label htmlFor="effectiveDate" className="utrecht-form-label">Ingangsdatum</label>
            <input
              id="effectiveDate"
              name="effectiveDate"
              type="date"
              className="utrecht-textbox"
              style={{ maxWidth: "100%" }}
            />
          </div>
          <div className="form-field">
            <label htmlFor="releaseDate" className="utrecht-form-label">
              Vrijgavedatum
              {status === "released" && (
                <span className="form-required" aria-label="verplicht"> *</span>
              )}
            </label>
            <input
              id="releaseDate"
              name="releaseDate"
              type="date"
              className="utrecht-textbox"
              style={{ maxWidth: "100%" }}
              required={status === "released"}
            />
            {status === "released" && (
              <p className="form-hint">Verplicht bij vrijgegeven bedragen.</p>
            )}
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="utrecht-button utrecht-button--primary-action" disabled={saving}>
            {saving ? "Opslaan..." : "Bedrag aanmaken"}
          </button>
          <Link href={`/financiering/${sourceId}`} className="utrecht-button utrecht-button--secondary-action">
            Annuleren
          </Link>
        </div>
      </form>
    </div>
  );
}
