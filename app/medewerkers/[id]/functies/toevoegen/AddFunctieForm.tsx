"use client";

import Link from "next/link";
import { useState } from "react";
import { Heading } from "@rijkshuisstijl-community/components-react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { useApiSubmit } from "@/lib/hooks/useApiSubmit";

interface FunctieOption {
  id: string;
  titel: string;
}

interface Props {
  employeeId: string;
  employeeName: string;
  functies: FunctieOption[];
}

export function AddFunctieForm({ employeeId, employeeName, functies }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const { error, saving, submit } = useApiSubmit(`/api/medewerkers/${employeeId}/functies`, "POST", {
    redirectTo: `/medewerkers/${employeeId}`,
  });
  const [isPrimary, setIsPrimary] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const startStr = fd.get("startDate") as string;
    await submit({
      functieId: fd.get("functieId"),
      isPrimary,
      startDate: startStr ? new Date(startStr).toISOString() : new Date().toISOString(),
    });
  }

  return (
    <div className="form-page">
      <Breadcrumbs crumbs={[
        { label: "Medewerkers", href: "/medewerkers" },
        { label: employeeName, href: `/medewerkers/${employeeId}` },
        { label: "Functie toevoegen" },
      ]} />
      <Heading level={1} style={{ marginBottom: "1.5rem" }}>Functie toevoegen</Heading>

      {error && (
        <div role="alert" className="form-alert">
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="functieId" className="utrecht-form-label">
            Functie <span className="form-required" aria-label="verplicht">*</span>
          </label>
          <select id="functieId" name="functieId" className="utrecht-select" required defaultValue="">
            <option value="" disabled>— Selecteer functie —</option>
            {functies.map(f => (
              <option key={f.id} value={f.id}>{f.titel}</option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="startDate" className="utrecht-form-label">
            Startdatum <span className="form-required" aria-label="verplicht">*</span>
          </label>
          <input
            id="startDate"
            name="startDate"
            type="date"
            className="utrecht-textbox"
            required
            defaultValue={today}
          />
        </div>

        <div className="form-field">
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={isPrimary}
              onChange={e => setIsPrimary(e.target.checked)}
            />
            Primaire functie (vervangt de huidige primaire functie als die bestaat)
          </label>
        </div>

        <div className="form-actions">
          <button type="submit" className="utrecht-button utrecht-button--primary-action" disabled={saving}>
            {saving ? "Toevoegen..." : "Functie toevoegen"}
          </button>
          <Link href={`/medewerkers/${employeeId}`} className="utrecht-button utrecht-button--secondary-action">
            Annuleren
          </Link>
        </div>
      </form>
    </div>
  );
}
