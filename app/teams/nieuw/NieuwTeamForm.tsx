"use client";

import Link from "next/link";
import { Heading } from "@rijkshuisstijl-community/components-react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { useApiSubmit } from "@/lib/hooks/useApiSubmit";

interface Org { id: string; name: string; }

interface Props { orgs: Org[]; defaultOrganisationId?: string | null; }

export function NieuwTeamForm({ orgs, defaultOrganisationId }: Props) {
  const { error, saving, submit } = useApiSubmit<{ id: string }>("/api/teams", "POST", {
    redirectTo: (data) => `/teams/${data.id}`,
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await submit({
      organisationId: fd.get("organisationId"),
      name: fd.get("name"),
      description: fd.get("description") || undefined,
    });
  }

  return (
    <div className="form-page">
      <Breadcrumbs crumbs={[{ label: "Teams", href: "/teams" }, { label: "Nieuw team" }]} />
      <Heading level={1} style={{ marginBottom: "1.5rem" }}>Nieuw team</Heading>

      {error && (
        <div role="alert" className="form-alert">
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="organisationId" className="utrecht-form-label">
            Organisatie <span className="form-required" aria-label="verplicht">*</span>
          </label>
          <select id="organisationId" name="organisationId" className="utrecht-select" required defaultValue={defaultOrganisationId ?? ""}>
            <option value="">— Kies een organisatie —</option>
            {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="name" className="utrecht-form-label">
            Naam <span className="form-required" aria-label="verplicht">*</span>
          </label>
          <input id="name" name="name" type="text" className="utrecht-textbox" required maxLength={200} autoFocus />
        </div>

        <div className="form-field">
          <label htmlFor="description" className="utrecht-form-label">Beschrijving</label>
          <textarea id="description" name="description" className="utrecht-textarea" rows={4} maxLength={1000} />
        </div>

        <div className="form-actions">
          <button type="submit" className="utrecht-button utrecht-button--primary-action" disabled={saving}>
            {saving ? "Opslaan..." : "Team aanmaken"}
          </button>
          <Link href="/teams" className="utrecht-button utrecht-button--secondary-action">
            Annuleren
          </Link>
        </div>
      </form>
    </div>
  );
}
