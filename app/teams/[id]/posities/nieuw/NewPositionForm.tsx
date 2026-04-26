"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heading } from "@rijkshuisstijl-community/components-react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

interface Props {
  teamId: string;
  teamName: string;
}

export function NewPositionForm({ teamId, teamName }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    setError(null);

    const startStr = fd.get("expectedStart") as string;
    const endStr = fd.get("expectedEnd") as string;
    const costStr = (fd.get("annualCost") as string).replace(",", ".");

    try {
      const res = await fetch("/api/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          type: fd.get("type"),
          positionCode: (fd.get("positionCode") as string) || undefined,
          schaal: (fd.get("schaal") as string) || undefined,
          annualCost: costStr ? parseFloat(costStr) : undefined,
          status: fd.get("status"),
          expectedStart: startStr ? new Date(startStr).toISOString() : undefined,
          expectedEnd: endStr ? new Date(endStr).toISOString() : undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Er is een fout opgetreden.");
        return;
      }
      router.push(`/teams/${teamId}`);
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
        { label: "Teams", href: "/teams" },
        { label: teamName, href: `/teams/${teamId}` },
        { label: "Nieuwe positie" },
      ]} />
      <Heading level={1} style={{ marginBottom: "1.5rem" }}>Nieuwe positie</Heading>

      {error && (
        <div role="alert" className="form-alert">
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="type" className="utrecht-form-label">
            Type <span className="form-required" aria-label="verplicht">*</span>
          </label>
          <input
            id="type"
            name="type"
            type="text"
            className="utrecht-textbox"
            required
            maxLength={50}
            autoFocus
            placeholder="bijv. OPF1, OPF2, PG-L"
          />
          <p className="form-hint">Het functietype zoals gehanteerd binnen de organisatie.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div className="form-field">
            <label htmlFor="positionCode" className="utrecht-form-label">Positiecode</label>
            <input
              id="positionCode"
              name="positionCode"
              type="text"
              className="utrecht-textbox"
              maxLength={50}
              placeholder="bijv. P-2025-047"
            />
          </div>
          <div className="form-field">
            <label htmlFor="schaal" className="utrecht-form-label">Schaal</label>
            <input
              id="schaal"
              name="schaal"
              type="text"
              className="utrecht-textbox"
              maxLength={10}
              placeholder="bijv. 8, 10, 12"
            />
            <p className="form-hint">Salarisschaal voor financieringsberekeningen.</p>
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="annualCost" className="utrecht-form-label">Jaarlijkse kosten (€)</label>
          <input
            id="annualCost"
            name="annualCost"
            type="number"
            step="0.01"
            min="0"
            className="utrecht-textbox"
            placeholder="0.00"
          />
          <p className="form-hint">Totale jaarlijkse personeelskosten incl. werkgeverslasten.</p>
        </div>

        <div className="form-field">
          <label htmlFor="status" className="utrecht-form-label">
            Status <span className="form-required" aria-label="verplicht">*</span>
          </label>
          <select id="status" name="status" className="utrecht-select" required defaultValue="planned">
            <option value="planned">Gepland</option>
            <option value="open">Open (vacature)</option>
            <option value="filled">Bezet</option>
            <option value="closed">Gesloten</option>
          </select>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div className="form-field">
            <label htmlFor="expectedStart" className="utrecht-form-label">Verwachte startdatum</label>
            <input
              id="expectedStart"
              name="expectedStart"
              type="date"
              className="utrecht-textbox"
              style={{ maxWidth: "100%" }}
            />
          </div>
          <div className="form-field">
            <label htmlFor="expectedEnd" className="utrecht-form-label">Verwachte einddatum</label>
            <input
              id="expectedEnd"
              name="expectedEnd"
              type="date"
              className="utrecht-textbox"
              style={{ maxWidth: "100%" }}
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="utrecht-button utrecht-button--primary-action" disabled={saving}>
            {saving ? "Opslaan..." : "Positie aanmaken"}
          </button>
          <Link href={`/teams/${teamId}`} className="utrecht-button utrecht-button--secondary-action">
            Annuleren
          </Link>
        </div>
      </form>
    </div>
  );
}
