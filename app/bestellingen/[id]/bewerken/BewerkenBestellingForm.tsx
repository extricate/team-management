"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heading } from "@rijkshuisstijl-community/components-react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

interface BestellingType { id: string; naam: string; }
interface Bestelling {
  id: string;
  atbNummer: string;
  omschrijving: string;
  typeId: string;
  geraamdBedrag: string | null;
  werkelijkBedrag: string | null;
  aanvraagDatum: Date | null;
  notities: string | null;
}

interface Props { bestelling: Bestelling; types: BestellingType[]; }

export function BewerkenBestellingForm({ bestelling, types }: Props) {
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
      const aanvraagRaw = fd.get("aanvraagDatum") as string;
      const res = await fetch(`/api/bestellingen/${bestelling.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          typeId: fd.get("typeId"),
          atbNummer: fd.get("atbNummer"),
          omschrijving: fd.get("omschrijving"),
          geraamdBedrag: geraamdRaw ? Number(geraamdRaw) : null,
          werkelijkBedrag: werkelijkRaw ? Number(werkelijkRaw) : null,
          aanvraagDatum: aanvraagRaw ? new Date(aanvraagRaw).toISOString() : null,
          notities: (fd.get("notities") as string) || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Er is een fout opgetreden.");
        return;
      }
      router.push(`/bestellingen/${bestelling.id}`);
    } catch {
      setError("Er is een verbindingsfout opgetreden.");
    } finally {
      setSaving(false);
    }
  }

  const defaultDate = bestelling.aanvraagDatum
    ? new Date(bestelling.aanvraagDatum).toISOString().slice(0, 10)
    : "";

  return (
    <div className="form-page">
      <Breadcrumbs crumbs={[{ label: "Bestellingen", href: "/bestellingen" }, { label: bestelling.atbNummer, href: `/bestellingen/${bestelling.id}` }, { label: "Bewerken" }]} />
      <Heading level={1} style={{ marginBottom: "1.5rem" }}>Bestelling bewerken</Heading>

      {error && (
        <div role="alert" className="form-alert">
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="typeId" className="utrecht-form-label">
            Type bestelling <span className="form-required" aria-label="verplicht">*</span>
          </label>
          <select id="typeId" name="typeId" className="utrecht-select" required defaultValue={bestelling.typeId}>
            {types.map(t => <option key={t.id} value={t.id}>{t.naam}</option>)}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="atbNummer" className="utrecht-form-label">
            ATB-nummer <span className="form-required" aria-label="verplicht">*</span>
          </label>
          <input id="atbNummer" name="atbNummer" type="text" className="utrecht-textbox" required maxLength={100}
            defaultValue={bestelling.atbNummer} />
        </div>

        <div className="form-field">
          <label htmlFor="omschrijving" className="utrecht-form-label">
            Omschrijving <span className="form-required" aria-label="verplicht">*</span>
          </label>
          <input id="omschrijving" name="omschrijving" type="text" className="utrecht-textbox" required maxLength={500}
            defaultValue={bestelling.omschrijving} />
        </div>

        <div className="form-field">
          <label htmlFor="geraamdBedrag" className="utrecht-form-label">Geraamd bedrag</label>
          <input id="geraamdBedrag" name="geraamdBedrag" type="number" min="0.01" step="0.01" className="utrecht-textbox"
            style={{ maxWidth: "200px" }} defaultValue={bestelling.geraamdBedrag ?? ""} />
        </div>

        <div className="form-field">
          <label htmlFor="werkelijkBedrag" className="utrecht-form-label">Werkelijk bedrag</label>
          <input id="werkelijkBedrag" name="werkelijkBedrag" type="number" min="0.01" step="0.01" className="utrecht-textbox"
            style={{ maxWidth: "200px" }} defaultValue={bestelling.werkelijkBedrag ?? ""} />
        </div>

        <div className="form-field">
          <label htmlFor="aanvraagDatum" className="utrecht-form-label">Aanvraagdatum</label>
          <input id="aanvraagDatum" name="aanvraagDatum" type="date" className="utrecht-textbox"
            style={{ maxWidth: "200px" }} defaultValue={defaultDate} />
        </div>

        <div className="form-field">
          <label htmlFor="notities" className="utrecht-form-label">Notities</label>
          <textarea id="notities" name="notities" className="utrecht-textarea" rows={3}
            defaultValue={bestelling.notities ?? ""} />
        </div>

        <div className="form-actions">
          <button type="submit" className="utrecht-button utrecht-button--primary-action" disabled={saving}>
            {saving ? "Opslaan..." : "Wijzigingen opslaan"}
          </button>
          <Link href={`/bestellingen/${bestelling.id}`} className="utrecht-button utrecht-button--secondary-action">Annuleren</Link>
        </div>
      </form>
    </div>
  );
}
