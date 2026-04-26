"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heading } from "@rijkshuisstijl-community/components-react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

interface Employee {
  id: string;
  firstName: string;
  prefixName?: string | null;
  lastName: string;
}

interface Props {
  teamId: string;
  teamName: string;
  employees: Employee[];
}

function fullName(e: Employee) {
  return e.prefixName ? `${e.firstName} ${e.prefixName} ${e.lastName}` : `${e.firstName} ${e.lastName}`;
}

export function AddLidForm({ teamId, teamName, employees }: Props) {
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
          teamId,
          employeeId: fd.get("employeeId"),
          startDate: new Date(startStr).toISOString(),
          reason: (fd.get("reason") as string) || undefined,
        }),
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
        { label: "Lid toevoegen" },
      ]} />
      <Heading level={1} style={{ marginBottom: "0.5rem" }}>Lid toevoegen</Heading>
      <p style={{ marginBottom: "1.5rem", color: "var(--rvo-color-grijs-600)", fontSize: "0.9375rem" }}>
        Team: <strong>{teamName}</strong>
      </p>

      {error && (
        <div role="alert" className="form-alert">
          <p>{error}</p>
        </div>
      )}

      {employees.length === 0 ? (
        <div className="form-alert" style={{ borderLeftColor: "var(--rvo-color-oranje-600, #e17000)", background: "var(--rvo-color-geel-100, #fff9e6)" }}>
          <p style={{ color: "var(--rvo-color-hemelblauw-800)" }}>
            Er zijn geen medewerkers beschikbaar binnen deze organisatie.{" "}
            <Link href="/medewerkers/nieuw" className="utrecht-link">Voeg eerst een medewerker toe.</Link>
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="employeeId" className="utrecht-form-label">
              Medewerker <span className="form-required" aria-label="verplicht">*</span>
            </label>
            <select id="employeeId" name="employeeId" className="utrecht-select" required autoFocus>
              <option value="">— Kies een medewerker —</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{fullName(emp)}</option>
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
            <p className="form-hint">De datum waarop het teamlidmaatschap ingaat.</p>
          </div>

          <div className="form-field">
            <label htmlFor="reason" className="utrecht-form-label">Reden</label>
            <textarea
              id="reason"
              name="reason"
              className="utrecht-textarea"
              rows={3}
              maxLength={500}
              placeholder="Optioneel: toelichting bij deze toevoeging"
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="utrecht-button utrecht-button--primary-action" disabled={saving}>
              {saving ? "Opslaan..." : "Lid toevoegen"}
            </button>
            <Link href={`/teams/${teamId}`} className="utrecht-button utrecht-button--secondary-action">
              Annuleren
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
