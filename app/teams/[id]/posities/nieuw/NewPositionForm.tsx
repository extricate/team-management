"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heading } from "@rijkshuisstijl-community/components-react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Alert } from "@rijkshuisstijl-community/components-react";
import { OPF_TYPES, getOPFType, CATEGORY_LABELS, CATEGORY_BADGE_COLOR } from "@/lib/opf-types";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface Props {
  teamId: string;
  organisationId: string;
  teamName: string;
}

export function NewPositionForm({ teamId, organisationId, teamName }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedOpfType, setSelectedOpfType] = useState<string>("");

  const opfDef = getOPFType(selectedOpfType);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    setError(null);

    const startStr = fd.get("expectedStart") as string;
    const endStr = fd.get("expectedEnd") as string;
    const requiredBeforeStr = fd.get("requiredBefore") as string;
    const costStr = (fd.get("annualCost") as string).replace(",", ".");

    try {
      const posRes = await fetch("/api/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organisationId,
          type: fd.get("type"),
          opfType: (fd.get("opfType") as string) || null,
          positionCode: (fd.get("positionCode") as string) || undefined,
          schaal: (fd.get("schaal") as string) || undefined,
          annualCost: costStr ? parseFloat(costStr) : undefined,
          status: fd.get("status"),
          expectedStart: startStr ? new Date(startStr).toISOString() : undefined,
          expectedEnd: endStr ? new Date(endStr).toISOString() : undefined,
          requiredBefore: requiredBeforeStr ? new Date(requiredBeforeStr).toISOString() : undefined,
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

      {error && (
        <div role="alert" className="form-alert">
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="type" className="utrecht-form-label">
            Functienaam <span className="form-required" aria-label="verplicht">*</span>
          </label>
          <input
            id="type"
            name="type"
            type="text"
            className="utrecht-textbox"
            required
            maxLength={100}
            autoFocus
            placeholder="bijv. Product Owner, Scrum Master, Teamleider"
          />
          <p className="form-hint">De identificerende naam van de functie binnen het team.</p>
        </div>

        <div className="form-field">
          <label htmlFor="opfType" className="utrecht-form-label">OPF-type</label>
          <select
            id="opfType"
            name="opfType"
            className="utrecht-select"
            value={selectedOpfType}
            onChange={e => setSelectedOpfType(e.target.value)}
          >
            <option value="">— Geen OPF-type —</option>
            {OPF_TYPES.map(t => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
          {opfDef ? (
            <Alert type="info" style={{ marginTop: "0.5rem" }}>
              <p style={{ margin: 0, fontSize: "0.875rem", display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                <StatusBadge label={CATEGORY_LABELS[opfDef.naturalCategory]} color={CATEGORY_BADGE_COLOR[opfDef.naturalCategory]} />
                {opfDef.hint}
              </p>
            </Alert>
          ) : (
            <p className="form-hint">Bepaalt het verwachte budgettype (PERSEX, MATEX of Investeringen) voor financieringscontroles.</p>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div className="form-field">
            <label htmlFor="positionCode" className="utrecht-form-label">Positiecode</label>
            <input
              id="positionCode"
              name="positionCode"
              type="text"
              className="utrecht-textbox"
              maxLength={50}
              placeholder="bijv. P-2025-047"
            />
          </div>
          <div className="form-field">
            <label htmlFor="schaal" className="utrecht-form-label">Schaal</label>
            <input
              id="schaal"
              name="schaal"
              type="text"
              className="utrecht-textbox"
              maxLength={10}
              placeholder="bijv. 8, 10, 12"
            />
            <p className="form-hint">Salarisschaal voor financieringsberekeningen.</p>
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="annualCost" className="utrecht-form-label">Jaarlijkse kosten (€)</label>
          <input
            id="annualCost"
            name="annualCost"
            type="number"
            step="0.01"
            min="0"
            className="utrecht-textbox"
            placeholder="0.00"
          />
          <p className="form-hint">Totale jaarlijkse kosten incl. werkgeverslasten{opfDef?.isExternal ? " (extern tarief)" : ""}.</p>
        </div>

        <div className="form-field">
          <label htmlFor="status" className="utrecht-form-label">
            Status <span className="form-required" aria-label="verplicht">*</span>
          </label>
          <select id="status" name="status" className="utrecht-select" required defaultValue="gepland">
            <option value="gepland">Gepland</option>
            <option value="gewenst">Gewenst</option>
            <option value="toegezegd">Toegezegd</option>
            <option value="open">Open (vacature)</option>
            <option value="gevuld">Bezet</option>
            <option value="gesloten">Gesloten</option>
          </select>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
          <div className="form-field">
            <label htmlFor="expectedStart" className="utrecht-form-label">Verwachte startdatum</label>
            <input id="expectedStart" name="expectedStart" type="date" className="utrecht-textbox" style={{ maxWidth: "100%" }} />
          </div>
          <div className="form-field">
            <label htmlFor="expectedEnd" className="utrecht-form-label">Verwachte einddatum</label>
            <input id="expectedEnd" name="expectedEnd" type="date" className="utrecht-textbox" style={{ maxWidth: "100%" }} />
          </div>
          <div className="form-field">
            <label htmlFor="requiredBefore" className="utrecht-form-label">Vereist vóór</label>
            <input id="requiredBefore" name="requiredBefore" type="date" className="utrecht-textbox" style={{ maxWidth: "100%" }} />
            <p className="form-hint">Uiterste datum voor invulling van de positie.</p>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="utrecht-button utrecht-button--primary-action" disabled={saving}>
            {saving ? "Opslaan..." : "Positie aanmaken"}
          </button>
          <Link href={`/teams/${teamId}`} className="utrecht-button utrecht-button--secondary-action">
            Annuleren
          </Link>
        </div>
      </form>
    </div>
  );
}
