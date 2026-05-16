"use client";

import Link from "next/link";
import { Heading } from "@rijkshuisstijl-community/components-react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { useApiSubmit } from "@/lib/hooks/useApiSubmit";
import type { Team } from "@/lib/db/schema";

interface Org { id: string; name: string; }
interface Props { team: Team & { organisation: { name: string } }; orgs: Org[]; }

export function TeamEditForm({ team, orgs }: Props) {
  const { error, saving, submit } = useApiSubmit(`/api/teams/${team.id}`, "PATCH", {
    redirectTo: `/teams/${team.id}`,
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await submit({
      organisationId: fd.get("organisationId"),
      name: fd.get("name"),
      description: (fd.get("description") as string) || undefined,
    });
  }

  return (
    <div className="form-page">
      <Breadcrumbs crumbs={[
        { label: "Teams", href: "/teams" },
        { label: team.name, href: `/teams/${team.id}` },
        { label: "Bewerken" },
      ]} />
      <Heading level={1} style={{ marginBottom: "1.5rem" }}>Team bewerken</Heading>

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
          <select id="organisationId" name="organisationId" className="utrecht-select" required defaultValue={team.organisationId}>
            {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="name" className="utrecht-form-label">
            Naam <span className="form-required" aria-label="verplicht">*</span>
          </label>
          <input id="name" name="name" type="text" className="utrecht-textbox" required maxLength={200} defaultValue={team.name} autoFocus />
        </div>

        <div className="form-field">
          <label htmlFor="description" className="utrecht-form-label">Beschrijving</label>
          <textarea id="description" name="description" className="utrecht-textarea" rows={4} defaultValue={team.description ?? ""} />
        </div>

        <div className="form-actions">
          <button type="submit" className="utrecht-button utrecht-button--primary-action" disabled={saving}>
            {saving ? "Opslaan..." : "Wijzigingen opslaan"}
          </button>
          <Link href={`/teams/${team.id}`} className="utrecht-button utrecht-button--secondary-action">
            Annuleren
          </Link>
        </div>
      </form>
    </div>
  );
}
