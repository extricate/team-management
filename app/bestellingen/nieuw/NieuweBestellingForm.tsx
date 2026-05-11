"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heading } from "@rijkshuisstijl-community/components-react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

interface Org { id: string; name: string; }
interface BestellingType { id: string; naam: string; }
interface Props { orgs: Org[]; types: BestellingType[]; }

export function NieuweBestellingForm({ orgs, types }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    setError(null);
    try {
      const geraamdRaw = fd.get("geraamdBedrag") as string;
      const werkelijkRaw = fd.get("werkelijkBedrag") as string;
      const res = await fetch("/api/bestellingen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organisationId: fd.get("organisationId"),
          typeId: fd.get("typeId"),
          atbNummer: fd.get("atbNummer"),
          omschrijving: fd.get("omschrijving"),
          geraamdBedrag: geraamdRaw ? Number(geraamdRaw) : undefined,
          werkelijkBedrag: werkelijkRaw ? Number(werkelijkRaw) : undefined,
          aanvraagDatum: fd.get("aanvraagDatum") ? new Date(fd.get("aanvraagDatum") as string).toISOString() : undefined,
          notities: fd.get("notities") || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Er is een fout opgetreden.");
        return;
      }
      const { data } = await res.json();
      router.push(`/bestellingen/${data.id}`);
    } catch {
      setError("Er is een verbindingsfout opgetreden.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="form-page">
      <Breadcrumbs crumbs={[{ label: "Bestellingen", href: "/bestellingen" }, { label: "Nieuwe bestelling" }]} />
      <Heading level={1} style={{ marginBottom: "1.5rem" }}>Nieuwe bestelling</Heading>

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
          <select id="organisationId" name="organisationId" className="utrecht-select" required>
            <option value="">— Kies een organisatie —</option>
            {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="typeId" className="utrecht-form-label">
            Type bestelling <span className="form-required" aria-label="verplicht">*</span>
          </label>
          <select id="typeId" name="typeId" className="utrecht-select" required>
            <option value="">— Kies een type —</option>
            {types.map(t => <option key={t.id} value={t.id}>{t.naam}</option>)}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="atbNummer" className="utrecht-form-label">
            ATB-nummer <span className="form-required" aria-label="verplicht">*</span>
          </label>
          <input id="atbNummer" name="atbNummer" type="text" className="utrecht-textbox" required maxLength={100} autoFocus
            placeholder="bijv. ATB-2025-001" />
          <p className="form-hint">Het referentienummer uit het externe systeem (SAP).</p>
        </div>

        <div className="form-field">
          <label htmlFor="omschrijving" className="utrecht-form-label">
            Omschrijving <span className="form-required" aria-label="verplicht">*</span>
          </label>
          <input id="omschrijving" name="omschrijving" type="text" className="utrecht-textbox" required maxLength={500}
            placeholder="bijv. Aanschaf 10 laptops voor Team A" />
        </div>

        <div className="form-field">
          <label htmlFor="geraamdBedrag" className="utrecht-form-label">Geraamd bedrag</label>
          <input id="geraamdBedrag" name="geraamdBedrag" type="number" min="0.01" step="0.01" className="utrecht-textbox"
            style={{ maxWidth: "200px" }} placeholder="bijv. 15000" />
          <p className="form-hint">Geschatte totaalkosten in euro's.</p>
        </div>

        <div className="form-field">
          <label htmlFor="werkelijkBedrag" className="utrecht-form-label">Werkelijk bedrag</label>
          <input id="werkelijkBedrag" name="werkelijkBedrag" type="number" min="0.01" step="0.01" className="utrecht-textbox"
            style={{ maxWidth: "200px" }} placeholder="bijv. 14850" />
          <p className="form-hint">Definitief bedrag na ontvangst (optioneel, in te vullen achteraf).</p>
        </div>

        <div className="form-field">
          <label htmlFor="aanvraagDatum" className="utrecht-form-label">Aanvraagdatum</label>
          <input id="aanvraagDatum" name="aanvraagDatum" type="date" className="utrecht-textbox" style={{ maxWidth: "200px" }} />
        </div>

        <div className="form-field">
          <label htmlFor="notities" className="utrecht-form-label">Notities</label>
          <textarea id="notities" name="notities" className="utrecht-textarea" rows={3}
            placeholder="Aanvullende informatie over deze bestelling…" />
        </div>

        <div className="form-actions">
          <button type="submit" className="utrecht-button utrecht-button--primary-action" disabled={saving}>
            {saving ? "Opslaan..." : "Bestelling aanmaken"}
          </button>
          <Link href="/bestellingen" className="utrecht-button utrecht-button--secondary-action">Annuleren</Link>
        </div>
      </form>
    </div>
  );
}
