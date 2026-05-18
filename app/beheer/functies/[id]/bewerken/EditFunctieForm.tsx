"use client";

import { useState } from "react";
import Link from "next/link";
import { Heading } from "@rijkshuisstijl-community/components-react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { useApiSubmit } from "@/lib/hooks/useApiSubmit";
import type { Functie } from "@/lib/db/schema";

interface Props { functie: Functie; }

export function EditFunctieForm({ functie }: Props) {
  const { error, saving, submit } = useApiSubmit(`/api/functies/${functie.id}`, "PATCH", {
    redirectTo: `/beheer/functies/${functie.id}`,
  });
  const [isActive, setIsActive] = useState(functie.isActive);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await submit({
      titel: (fd.get("titel") as string).trim(),
      schaalCode: (fd.get("schaalCode") as string).trim() || null,
      isActive,
    });
  }

  return (
    <div className="form-page">
      <Breadcrumbs crumbs={[
        { label: "Beheer", href: "/beheer/salarisschalen" },
        { label: "Functies", href: "/beheer/functies" },
        { label: functie.titel, href: `/beheer/functies/${functie.id}` },
        { label: "Bewerken" },
      ]} />
      <Heading level={1} style={{ marginBottom: "1.5rem" }}>Functie bewerken</Heading>

      {error && (
        <div role="alert" className="form-alert">
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="titel" className="utrecht-form-label">
            Titel <span className="form-required" aria-label="verplicht">*</span>
          </label>
          <input
            id="titel"
            name="titel"
            type="text"
            className="utrecht-textbox"
            required
            maxLength={200}
            defaultValue={functie.titel}
            autoFocus
          />
        </div>

        <div className="form-field">
          <label htmlFor="schaalCode" className="utrecht-form-label">Schaalcode</label>
          <input
            id="schaalCode"
            name="schaalCode"
            type="text"
            className="utrecht-textbox"
            maxLength={20}
            defaultValue={functie.schaalCode ?? ""}
            placeholder="bijv. 10, 12, KOL, LTKOL"
          />
          <p className="form-hint">Standaard salarisschaal voor deze functie.</p>
        </div>

        <div className="form-field">
          <label className="utrecht-form-label">Status</label>
          <div style={{ display: "flex", gap: "1.5rem", marginTop: "0.25rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
              <input
                type="radio"
                name="isActive"
                value="true"
                checked={isActive}
                onChange={() => setIsActive(true)}
              />
              Actief
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
              <input
                type="radio"
                name="isActive"
                value="false"
                checked={!isActive}
                onChange={() => setIsActive(false)}
              />
              Inactief (niet meer selecteerbaar voor nieuwe posities)
            </label>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="utrecht-button utrecht-button--primary-action" disabled={saving}>
            {saving ? "Opslaan..." : "Wijzigingen opslaan"}
          </button>
          <Link href={`/beheer/functies/${functie.id}`} className="utrecht-button utrecht-button--secondary-action">
            Annuleren
          </Link>
        </div>
      </form>
    </div>
  );
}
