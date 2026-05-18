"use client";

import { Heading } from "@rijkshuisstijl-community/components-react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { useApiSubmit } from "@/lib/hooks/useApiSubmit";
import type { Position } from "@/lib/db/schema";
import { PositionFormFields, type FunctieOption, type PositionSubmitData } from "@/components/forms/PositionFormFields";

interface Props {
  position: Position;
  functies: FunctieOption[];
  positieNaam: string;
}

export function EditPositieForm({ position, functies, positieNaam }: Props) {
  const { error, saving, submit } = useApiSubmit(`/api/positions/${position.id}`, "PATCH", {
    redirectTo: `/posities/${position.id}`,
  });

  async function handleSubmit(data: PositionSubmitData) {
    await submit(data);
  }

  return (
    <div className="form-page">
      <Breadcrumbs crumbs={[
        { label: "Posities", href: "/posities" },
        { label: positieNaam, href: `/posities/${position.id}` },
        { label: "Bewerken" },
      ]} />
      <Heading level={1} style={{ marginBottom: "1.5rem" }}>Positie bewerken</Heading>

      <PositionFormFields
        functies={functies}
        initialValues={{
          functieId: position.functieId,
          roltitel: position.roltitel,
          opfType: position.opfType,
          positionCode: position.positionCode,
          schaal: position.schaal,
          annualCost: position.annualCost ?? undefined,
          status: position.status,
          expectedStart: position.expectedStart,
          expectedEnd: position.expectedEnd,
          requiredBefore: position.requiredBefore,
        }}
        onSubmit={handleSubmit}
        saving={saving}
        error={error}
        submitLabel="Wijzigingen opslaan"
        cancelHref={`/posities/${position.id}`}
      />
    </div>
  );
}
