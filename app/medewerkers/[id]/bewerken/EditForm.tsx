"use client";

import Link from "next/link";
import { Heading } from "@rijkshuisstijl-community/components-react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { formatFullName } from "@/lib/utils";
import { useApiSubmit } from "@/lib/hooks/useApiSubmit";
import type { Employee } from "@/lib/db/schema";

interface Org { id: string; name: string; }
interface Props { emp: Employee; orgs: Org[]; }

export function MedewerkerEditForm({ emp, orgs }: Props) {
  const { error, saving, submit } = useApiSubmit(`/api/employees/${emp.id}`, "PATCH", {
    redirectTo: `/medewerkers/${emp.id}`,
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await submit({
      organisationId: fd.get("organisationId"),
      personeelsnummer: (fd.get("personeelsnummer") as string) || null,
      firstName: fd.get("firstName"),
      prefixName: (fd.get("prefixName") as string) || null,
      lastName: fd.get("lastName"),
    });
  }

  const fullName = formatFullName(emp);

  return (
    <div className="form-page">
      <Breadcrumbs crumbs={[
        { label: "Medewerkers", href: "/medewerkers" },
        { label: fullName, href: `/medewerkers/${emp.id}` },
        { label: "Bewerken" },
      ]} />
      <Heading level={1} style={{ marginBottom: "1.5rem" }}>Medewerker bewerken</Heading>

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
          <select id="organisationId" name="organisationId" className="utrecht-select" required defaultValue={emp.organisationId}>
            {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="personeelsnummer" className="utrecht-form-label">Personeelsnummer</label>
          <input id="personeelsnummer" name="personeelsnummer" type="text" className="utrecht-textbox" maxLength={50} defaultValue={emp.personeelsnummer ?? ""} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "1rem", alignItems: "end" }}>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label htmlFor="firstName" className="utrecht-form-label">
              Voornaam <span className="form-required" aria-label="verplicht">*</span>
            </label>
            <input id="firstName" name="firstName" type="text" className="utrecht-textbox" style={{ maxWidth: "100%" }} required maxLength={100} defaultValue={emp.firstName} autoFocus />
          </div>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label htmlFor="prefixName" className="utrecht-form-label">Tussenvoegsel</label>
            <input id="prefixName" name="prefixName" type="text" className="utrecht-textbox" style={{ maxWidth: "6rem" }} maxLength={20} defaultValue={emp.prefixName ?? ""} />
          </div>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label htmlFor="lastName" className="utrecht-form-label">
              Achternaam <span className="form-required" aria-label="verplicht">*</span>
            </label>
            <input id="lastName" name="lastName" type="text" className="utrecht-textbox" style={{ maxWidth: "100%" }} required maxLength={100} defaultValue={emp.lastName} />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="utrecht-button utrecht-button--primary-action" disabled={saving}>
            {saving ? "Opslaan..." : "Wijzigingen opslaan"}
          </button>
          <Link href={`/medewerkers/${emp.id}`} className="utrecht-button utrecht-button--secondary-action">
            Annuleren
          </Link>
        </div>
      </form>
    </div>
  );
}
