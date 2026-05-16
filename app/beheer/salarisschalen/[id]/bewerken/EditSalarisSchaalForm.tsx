"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heading } from "@rijkshuisstijl-community/components-react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { useApiSubmit } from "@/lib/hooks/useApiSubmit";
import type { Salarisschaal } from "@/lib/db/schema";

interface Props {
  schaal: Salarisschaal;
}

export function EditSalarisSchaalForm({ schaal }: Props) {
  const router = useRouter();
  const { error: patchError, saving, submit } = useApiSubmit(`/api/salarisschalen/${schaal.id}`, "PATCH", {
    redirectTo: "/beheer/salarisschalen",
  });
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const error = patchError ?? deleteError;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const primaryCost = parseFloat((fd.get("primaryCost") as string).replace(",", "."));
    const secondaryEffects = parseFloat((fd.get("secondaryEffects") as string).replace(",", ".") || "0");
    const tertiaryEffects = parseFloat((fd.get("tertiaryEffects") as string).replace(",", ".") || "0");
    await submit({
      schaalCode: (fd.get("schaalCode") as string).trim(),
      year: parseInt(fd.get("year") as string, 10),
      primaryCost,
      secondaryEffects: isNaN(secondaryEffects) ? 0 : secondaryEffects,
      tertiaryEffects: isNaN(tertiaryEffects) ? 0 : tertiaryEffects,
    });
  }

  async function handleDelete() {
    if (!confirm(`Salarisschaal "${schaal.schaalCode}" (${schaal.year}) verwijderen?`)) return;
    setDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/salarisschalen/${schaal.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json();
        setDeleteError(body.error ?? "Verwijderen mislukt.");
        return;
      }
      router.push("/beheer/salarisschalen");
      router.refresh();
    } catch {
      setDeleteError("Er is een verbindingsfout opgetreden.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="form-page">
      <Breadcrumbs crumbs={[
        { label: "Salarisschalen", href: "/beheer/salarisschalen" },
        { label: `${schaal.schaalCode} (${schaal.year})` },
      ]} />
      <Heading level={1} style={{ marginBottom: "1.5rem" }}>
        Schaal {schaal.schaalCode} – {schaal.year} bewerken
      </Heading>

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
              defaultValue={schaal.schaalCode}
            />
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
              defaultValue={schaal.year}
            />
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--rvo-color-grijs-300)", marginTop: "0.5rem", paddingTop: "1rem" }}>
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
                defaultValue={schaal.primaryCost}
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
                className="utrecht-textbox"
                defaultValue={schaal.secondaryEffects}
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
                className="utrecht-textbox"
                defaultValue={schaal.tertiaryEffects}
              />
              <p className="form-hint">Overhead, faciliteiten</p>
            </div>
          </div>
        </div>

        <div className="form-actions" style={{ justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="submit" className="utrecht-button utrecht-button--primary-action" disabled={saving || deleting}>
              {saving ? "Opslaan..." : "Opslaan"}
            </button>
            <Link href="/beheer/salarisschalen" className="utrecht-button utrecht-button--secondary-action">
              Annuleren
            </Link>
          </div>
          <button
            type="button"
            className="utrecht-button utrecht-button--danger-action"
            onClick={handleDelete}
            disabled={saving || deleting}
          >
            {deleting ? "Verwijderen..." : "Verwijderen"}
          </button>
        </div>
      </form>
    </div>
  );
}
