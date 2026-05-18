"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heading } from "@rijkshuisstijl-community/components-react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import type { Position } from "@/lib/db/schema";
import { PositionFormFields, type FunctieOption, type PositionSubmitData } from "@/components/forms/PositionFormFields";

interface Props {
  position: Position;
  teamId: string;
  teamName: string;
  functies: FunctieOption[];
}

export function EditPositionForm({ position, teamId, teamName, functies }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(data: PositionSubmitData) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/positions/${position.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Er is een fout opgetreden.");
        return;
      }
      router.push(`/teams/${teamId}`);
      router.refresh();
    } catch {
      setError("Er is een verbindingsfout opgetreden.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="form-page">
      <Breadcrumbs crumbs={[
        { label: "Teams", href: "/teams" },
        { label: teamName, href: `/teams/${teamId}` },
        { label: "Positie bewerken" },
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
        cancelHref={`/teams/${teamId}`}
      />
    </div>
  );
}
