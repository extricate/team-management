"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heading } from "@rijkshuisstijl-community/components-react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

interface Team { id: string; name: string; }

interface Props {
  employeeId: string;
  employeeName: string;
  teams: Team[];
}

export function AddTeamForm({ employeeId, employeeName, teams }: Props) {
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
      const res = await fetch("/api/team-memberships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          teamId: fd.get("teamId"),
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
        { label: "Team toevoegen" },
      ]} />
      <Heading level={1} style={{ marginBottom: "0.5rem" }}>Team toevoegen</Heading>
      <p style={{ marginBottom: "1.5rem", color: "var(--rvo-color-grijs-600)", fontSize: "0.9375rem" }}>
        Medewerker: <strong>{employeeName}</strong>
      </p>

      {error && (
        <div role="alert" className="form-alert">
          <p>{error}</p>
        </div>
      )}

      {teams.length === 0 ? (
        <div className="form-alert" style={{ borderLeftColor: "var(--rvo-color-oranje-600, #e17000)", background: "var(--rvo-color-geel-100, #fff9e6)" }}>
          <p style={{ color: "var(--rvo-color-hemelblauw-800)" }}>
            Er zijn geen teams beschikbaar binnen deze organisatie.{" "}
            <Link href="/teams/nieuw" className="utrecht-link">Voeg eerst een team toe.</Link>
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="teamId" className="utrecht-form-label">
              Team <span className="form-required" aria-label="verplicht">*</span>
            </label>
            <select id="teamId" name="teamId" className="utrecht-select" required autoFocus>
              <option value="">— Kies een team —</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
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
            <p className="form-hint">De datum waarop het lidmaatschap ingaat.</p>
          </div>

          <div className="form-field">
            <label htmlFor="reason" className="utrecht-form-label">Reden</label>
            <textarea
              id="reason"
              name="reason"
              className="utrecht-textarea"
              rows={3}
              maxLength={500}
              placeholder="Optioneel: toelichting bij dit lidmaatschap"
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="utrecht-button utrecht-button--primary-action" disabled={saving}>
              {saving ? "Opslaan..." : "Toevoegen aan team"}
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
