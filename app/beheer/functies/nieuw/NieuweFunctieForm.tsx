"use client";

import Link from "next/link";
import { Heading } from "@rijkshuisstijl-community/components-react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { useApiSubmit } from "@/lib/hooks/useApiSubmit";

export function NieuweFunctieForm() {
  const { error, saving, submit } = useApiSubmit("/api/functies", "POST", {
    redirectTo: "/beheer/functies",
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await submit({
      titel: (fd.get("titel") as string).trim(),
      schaalCode: (fd.get("schaalCode") as string).trim() || null,
      isActive: true,
    });
  }

  return (
    <div className="form-page">
      <Breadcrumbs crumbs={[
        { label: "Beheer", href: "/beheer/salarisschalen" },
        { label: "Functies", href: "/beheer/functies" },
        { label: "Nieuwe functie" },
      ]} />
      <Heading level={1} style={{ marginBottom: "1.5rem" }}>Nieuwe functie</Heading>

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
            autoFocus
            placeholder="bijv. Product Owner, Scrum Master"
          />
          <p className="form-hint">De officiële functietitel zoals gehanteerd binnen de organisatie.</p>
        </div>

        <div className="form-field">
          <label htmlFor="schaalCode" className="utrecht-form-label">Schaalcode</label>
          <input
            id="schaalCode"
            name="schaalCode"
            type="text"
            className="utrecht-textbox"
            maxLength={20}
            placeholder="bijv. 10, 12, KOL, LTKOL"
          />
          <p className="form-hint">Standaard salarisschaal voor deze functie. Wordt automatisch gebruikt bij posities.</p>
        </div>

        <div className="form-actions">
          <button type="submit" className="utrecht-button utrecht-button--primary-action" disabled={saving}>
            {saving ? "Aanmaken..." : "Functie aanmaken"}
          </button>
          <Link href="/beheer/functies" className="utrecht-button utrecht-button--secondary-action">
            Annuleren
          </Link>
        </div>
      </form>
    </div>
  );
}
