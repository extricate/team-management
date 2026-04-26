"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heading } from "@rijkshuisstijl-community/components-react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

interface Position {
  id: string;
  type: string;
  positionCode: string | null;
  team: { id: string; name: string };
}

interface Props {
  employeeId: string;
  employeeName: string;
  positions: Position[];
}

export function AssignPositieForm({ employeeId, employeeName, positions }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const startStr = fd.get("startDate") as string;
    if (!startStr) { setError("Startdatum is verplicht."); return; }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/position-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          positionId: fd.get("positionId"),
          startDate: new Date(startStr).toISOString(),
          reason: (fd.get("reason") as string) || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Er is een fout opgetreden.");
        return;
      }
      router.push(`/medewerkers/${employeeId}`);
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
        { label: "Medewerkers", href: "/medewerkers" },
        { label: employeeName, href: `/medewerkers/${employeeId}` },
        { label: "Positie toewijzen" },
      ]} />
      <Heading level={1} style={{ marginBottom: "0.5rem" }}>Positie toewijzen</Heading>
      <p style={{ marginBottom: "1.5rem", color: "var(--rvo-color-grijs-600)", fontSize: "0.9375rem" }}>
        Medewerker: <strong>{employeeName}</strong>
      </p>

      {error && (
        <div role="alert" className="form-alert">
          <p>{error}</p>
        </div>
      )}

      {positions.length === 0 ? (
        <div className="form-alert" style={{ borderLeftColor: "var(--rvo-color-oranje-600, #e17000)", background: "var(--rvo-color-geel-100, #fff9e6)" }}>
          <p style={{ color: "var(--rvo-color-hemelblauw-800)" }}>
            Er zijn geen open posities beschikbaar binnen deze organisatie. Voeg eerst een openstaande positie
            toe via een team, of zet de status van een bestaande positie op <strong>Open</strong>.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="positionId" className="utrecht-form-label">
              Positie <span className="form-required" aria-label="verplicht">*</span>
            </label>
            <select id="positionId" name="positionId" className="utrecht-select" required autoFocus>
              <option value="">— Kies een positie —</option>
              {positions.map(p => (
                <option key={p.id} value={p.id}>
                  {p.type}{p.positionCode ? ` (${p.positionCode})` : ""} — {p.team.name}
                </option>
              ))}
            </select>
            <p className="form-hint">Alleen openstaande posities binnen de organisatie worden getoond.</p>
          </div>

          <div className="form-field">
            <label htmlFor="startDate" className="utrecht-form-label">
              Startdatum <span className="form-required" aria-label="verplicht">*</span>
            </label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              className="utrecht-textbox"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
            <p className="form-hint">De datum waarop de medewerker de positie inneemt.</p>
          </div>

          <div className="form-field">
            <label htmlFor="reason" className="utrecht-form-label">Reden</label>
            <textarea
              id="reason"
              name="reason"
              className="utrecht-textarea"
              rows={3}
              maxLength={500}
              placeholder="Optioneel: toelichting bij deze toewijzing"
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="utrecht-button utrecht-button--primary-action" disabled={saving}>
              {saving ? "Opslaan..." : "Positie toewijzen"}
            </button>
            <Link href={`/medewerkers/${employeeId}`} className="utrecht-button utrecht-button--secondary-action">
              Annuleren
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
