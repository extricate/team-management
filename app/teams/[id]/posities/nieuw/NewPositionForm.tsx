"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heading } from "@rijkshuisstijl-community/components-react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PositionFormFields, type FunctieOption, type PositionSubmitData } from "@/components/forms/PositionFormFields";

interface Props {
  teamId: string;
  organisationId: string;
  teamName: string;
  functies: FunctieOption[];
}

export function NewPositionForm({ teamId, organisationId, teamName, functies }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(data: PositionSubmitData) {
    setSaving(true);
    setError(null);
    try {
      const posRes = await fetch("/api/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organisationId,
          ...data,
        }),
      });
      if (!posRes.ok) {
        const body = await posRes.json();
        setError(body.error ?? "Er is een fout opgetreden.");
        return;
      }
      const { data: newPosition } = await posRes.json();

      const couplingRes = await fetch("/api/team-position-couplings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          positionId: newPosition.id,
          startDate: new Date().toISOString(),
        }),
      });
      if (!couplingRes.ok) {
        const body = await couplingRes.json();
        setError(body.error ?? "Positie aangemaakt maar koppeling met team mislukt.");
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
        { label: "Nieuwe positie" },
      ]} />
      <Heading level={1} style={{ marginBottom: "1.5rem" }}>Nieuwe positie</Heading>

      <PositionFormFields
        functies={functies}
        onSubmit={handleSubmit}
        saving={saving}
        error={error}
        submitLabel="Positie aanmaken"
        cancelHref={`/teams/${teamId}`}
      />
    </div>
  );
}
