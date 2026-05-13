"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heading } from "@rijkshuisstijl-community/components-react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

export function NieuwSalarisSchaalForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    setError(null);

    const primaryCost = parseFloat((fd.get("primaryCost") as string).replace(",", "."));
    const secondaryEffects = parseFloat((fd.get("secondaryEffects") as string).replace(",", ".") || "0");
    const tertiaryEffects = parseFloat((fd.get("tertiaryEffects") as string).replace(",", ".") || "0");

    try {
      const res = await fetch("/api/salarisschalen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schaalCode: (fd.get("schaalCode") as string).trim(),
          year: parseInt(fd.get("year") as string, 10),
          primaryCost,
          secondaryEffects: isNaN(secondaryEffects) ? 0 : secondaryEffects,
          tertiaryEffects: isNaN(tertiaryEffects) ? 0 : tertiaryEffects,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Er is een fout opgetreden.");
        return;
      }

      router.push("/beheer/salarisschalen");
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
        { label: "Beheer", href: "/beheer/salarisschalen" },
        { label: "Salarisschalen", href: "/beheer/salarisschalen" },
        { label: "Nieuwe schaal" },
      ]} />
      <Heading level={1} style={{ marginBottom: "1.5rem" }}>Nieuwe salarisschaal</Heading>

      {error && (
        <div role="alert" className="form-alert">
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div className="form-field">
            <label htmlFor="schaalCode" className="utrecht-form-label">
              Schaalcode <span className="form-required" aria-label="verplicht">*</span>
            </label>
            <input
              id="schaalCode"
              name="schaalCode"
              type="text"
              className="utrecht-textbox"
              required
              maxLength={20}
              autoFocus
              placeholder="bijv. 10, 12, KOL, LTKOL"
            />
            <p className="form-hint">IBBAD-schaal of militaire rang (KOL, LTKOL, SGT, etc.)</p>
          </div>

          <div className="form-field">
            <label htmlFor="year" className="utrecht-form-label">
              Jaar <span className="form-required" aria-label="verplicht">*</span>
            </label>
            <input
              id="year"
              name="year"
              type="number"
              className="utrecht-textbox"
              required
              min={2000}
              max={2100}
              defaultValue={new Date().getFullYear()}
            />
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--rvo-color-grijs-300)", marginTop: "0.5rem", paddingTop: "1rem" }}>
          <p className="form-hint" style={{ marginBottom: "1rem" }}>
            De jaarlijkse kosten worden automatisch berekend als de som van de drie componenten.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
            <div className="form-field">
              <label htmlFor="primaryCost" className="utrecht-form-label">
                Primaire kosten (€) <span className="form-required" aria-label="verplicht">*</span>
              </label>
              <input
                id="primaryCost"
                name="primaryCost"
                type="number"
                step="0.01"
                min="0"
                className="utrecht-textbox"
                required
                placeholder="0.00"
              />
              <p className="form-hint">Salariskosten (1e orde)</p>
            </div>

            <div className="form-field">
              <label htmlFor="secondaryEffects" className="utrecht-form-label">2e-orde-effecten (€)</label>
              <input
                id="secondaryEffects"
                name="secondaryEffects"
                type="number"
                step="0.01"
                min="0"
                defaultValue="0"
                className="utrecht-textbox"
                placeholder="0.00"
              />
              <p className="form-hint">Werkgeverslasten, pensioen</p>
            </div>

            <div className="form-field">
              <label htmlFor="tertiaryEffects" className="utrecht-form-label">3e-orde-effecten (€)</label>
              <input
                id="tertiaryEffects"
                name="tertiaryEffects"
                type="number"
                step="0.01"
                min="0"
                defaultValue="0"
                className="utrecht-textbox"
                placeholder="0.00"
              />
              <p className="form-hint">Overhead, faciliteiten</p>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="utrecht-button utrecht-button--primary-action" disabled={saving}>
            {saving ? "Opslaan..." : "Schaal aanmaken"}
          </button>
          <Link href="/beheer/salarisschalen" className="utrecht-button utrecht-button--secondary-action">
            Annuleren
          </Link>
        </div>
      </form>
    </div>
  );
}
