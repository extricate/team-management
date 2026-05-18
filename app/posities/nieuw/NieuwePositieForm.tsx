"use client";

import { useState } from "react";
import { Heading } from "@rijkshuisstijl-community/components-react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { useApiSubmit } from "@/lib/hooks/useApiSubmit";
import { PositionFormFields, type FunctieOption, type PositionSubmitData } from "@/components/forms/PositionFormFields";

interface Organisation {
  id: string;
  name: string;
}

interface Props {
  organisations: Organisation[];
  functies: FunctieOption[];
  defaultOrganisationId?: string;
}

export function NieuwePositieForm({ organisations, functies, defaultOrganisationId }: Props) {
  const { error, saving, submit } = useApiSubmit<{ id: string }>("/api/positions", "POST", {
    redirectTo: (data) => `/posities/${data.id}`,
  });
  const [organisationId, setOrganisationId] = useState<string>(defaultOrganisationId ?? "");

  async function handleSubmit(data: PositionSubmitData) {
    await submit({ organisationId, ...data });
  }

  return (
    <div className="form-page">
      <Breadcrumbs crumbs={[
        { label: "Posities", href: "/posities" },
        { label: "Nieuwe positie" },
      ]} />
      <Heading level={1} style={{ marginBottom: "1.5rem" }}>Nieuwe positie</Heading>

      <PositionFormFields
        functies={functies}
        onSubmit={handleSubmit}
        saving={saving}
        error={error}
        submitLabel="Positie aanmaken"
        cancelHref="/posities"
      >
        <div className="form-field">
          <label htmlFor="organisationId" className="utrecht-form-label">
            Organisatie <span className="form-required" aria-label="verplicht">*</span>
          </label>
          <select
            id="organisationId"
            name="organisationId"
            className="utrecht-select"
            required
            value={organisationId}
            onChange={e => setOrganisationId(e.target.value)}
          >
            <option value="" disabled>— Selecteer organisatie —</option>
            {organisations.map(o => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
      </PositionFormFields>
    </div>
  );
}
