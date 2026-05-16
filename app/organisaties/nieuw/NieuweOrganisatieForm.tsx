"use client";

import Link from "next/link";
import { Heading } from "@rijkshuisstijl-community/components-react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { useApiSubmit } from "@/lib/hooks/useApiSubmit";

export function NieuweOrganisatieForm() {
  const { error, saving, submit } = useApiSubmit<{ id: string }>("/api/organisations", "POST", {
    redirectTo: (data) => `/organisaties/${data.id}`,
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await submit({ name: fd.get("name"), type: fd.get("type") });
  }

  return (
    <div className="form-page">
      <Breadcrumbs crumbs={[{ label: "Organisaties", href: "/organisaties" }, { label: "Nieuwe organisatie" }]} />
      <Heading level={1} style={{ marginBottom: "1.5rem" }}>Nieuwe organisatie</Heading>

      {error && (
        <div role="alert" className="form-alert">
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="name" className="utrecht-form-label">
            Naam <span className="form-required" aria-label="verplicht">*</span>
          </label>
          <input id="name" name="name" type="text" className="utrecht-textbox" required maxLength={200} autoFocus />
        </div>

        <div className="form-field">
          <label htmlFor="type" className="utrecht-form-label">
            Type <span className="form-required" aria-label="verplicht">*</span>
          </label>
          <select id="type" name="type" className="utrecht-select" required>
            <option value="">— Kies een type —</option>
            <option value="OS1">OS1</option>
            <option value="OS2">OS2</option>
          </select>
        </div>

        <div className="form-actions">
          <button type="submit" className="utrecht-button utrecht-button--primary-action" disabled={saving}>
            {saving ? "Opslaan..." : "Organisatie aanmaken"}
          </button>
          <Link href="/organisaties" className="utrecht-button utrecht-button--secondary-action">
            Annuleren
          </Link>
        </div>
      </form>
    </div>
  );
}
