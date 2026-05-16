"use client";

import Link from "next/link";
import { Heading } from "@rijkshuisstijl-community/components-react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { useApiSubmit } from "@/lib/hooks/useApiSubmit";
import type { Organisation } from "@/lib/db/schema";

interface Props { org: Organisation; }

export function OrganisatieEditForm({ org }: Props) {
  const { error, saving, submit } = useApiSubmit(`/api/organisations/${org.id}`, "PATCH", {
    redirectTo: `/organisaties/${org.id}`,
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await submit({ name: fd.get("name"), type: fd.get("type") });
  }

  return (
    <div className="form-page">
      <Breadcrumbs crumbs={[
        { label: "Organisaties", href: "/organisaties" },
        { label: org.name, href: `/organisaties/${org.id}` },
        { label: "Bewerken" },
      ]} />
      <Heading level={1} style={{ marginBottom: "1.5rem" }}>Organisatie bewerken</Heading>

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
          <input id="name" name="name" type="text" className="utrecht-textbox" required maxLength={200} defaultValue={org.name} autoFocus />
        </div>

        <div className="form-field">
          <label htmlFor="type" className="utrecht-form-label">
            Type <span className="form-required" aria-label="verplicht">*</span>
          </label>
          <select id="type" name="type" className="utrecht-select" required defaultValue={org.type}>
            <option value="OS1">OS1</option>
            <option value="OS2">OS2</option>
          </select>
        </div>

        <div className="form-actions">
          <button type="submit" className="utrecht-button utrecht-button--primary-action" disabled={saving}>
            {saving ? "Opslaan..." : "Wijzigingen opslaan"}
          </button>
          <Link href={`/organisaties/${org.id}`} className="utrecht-button utrecht-button--secondary-action">
            Annuleren
          </Link>
        </div>
      </form>
    </div>
  );
}
