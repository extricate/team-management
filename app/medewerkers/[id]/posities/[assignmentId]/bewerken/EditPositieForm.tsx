"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heading } from "@rijkshuisstijl-community/components-react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

interface Assignment {
  id: string;
  status: string;
  startDate: Date | string;
  endDate: Date | string | null;
  reason: string | null;
}

interface Props {
  assignment: Assignment;
  employeeId: string;
  employeeName: string;
  positionLabel: string;
}

function toDateInput(val: Date | string | null | undefined): string {
  if (!val) return "";
  const d = typeof val === "string" ? new Date(val) : val;
  return d.toISOString().slice(0, 10);
}

export function EditPositieForm({ assignment, employeeId, employeeName, positionLabel }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(assignment.status);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const startStr = fd.get("startDate") as string;
    const endStr = fd.get("endDate") as string;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/position-assignments/${assignment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: fd.get("status"),
          startDate: new Date(startStr).toISOString(),
          endDate: endStr ? new Date(endStr).toISOString() : null,
          reason: (fd.get("reason") as string) || null,
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
        { label: "Positietoewijzing bewerken" },
      ]} />
      <Heading level={1} style={{ marginBottom: "0.5rem" }}>Positietoewijzing bewerken</Heading>
      <p style={{ marginBottom: "1.5rem", color: "var(--rvo-color-grijs-600)", fontSize: "0.9375rem" }}>
        Medewerker: <strong>{employeeName}</strong>
        {" · "}Positie: <strong>{positionLabel}</strong>
      </p>

      {error && (
        <div role="alert" className="form-alert">
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="status" className="utrecht-form-label">
            Status <span className="form-required" aria-label="verplicht">*</span>
          </label>
          <select
            id="status"
            name="status"
            className="utrecht-select"
            required
            autoFocus
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            <option value="active">Actief</option>
            <option value="ended">Beëindigd</option>
          </select>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
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
              defaultValue={toDateInput(assignment.startDate)}
              style={{ maxWidth: "100%" }}
            />
          </div>
          <div className="form-field">
            <label htmlFor="endDate" className="utrecht-form-label">
              Einddatum
              {status === "ended" && <span className="form-required" aria-label="verplicht"> *</span>}
            </label>
            <input
              id="endDate"
              name="endDate"
              type="date"
              className="utrecht-textbox"
              required={status === "ended"}
              defaultValue={toDateInput(assignment.endDate)}
              style={{ maxWidth: "100%" }}
            />
            {status === "ended" && (
              <p className="form-hint">Verplicht bij beëindigde toewijzingen.</p>
            )}
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="reason" className="utrecht-form-label">Reden</label>
          <textarea
            id="reason"
            name="reason"
            className="utrecht-textarea"
            rows={3}
            maxLength={500}
            defaultValue={assignment.reason ?? ""}
            placeholder="Optioneel: toelichting bij deze wijziging"
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="utrecht-button utrecht-button--primary-action" disabled={saving}>
            {saving ? "Opslaan..." : "Wijzigingen opslaan"}
          </button>
          <Link href={`/medewerkers/${employeeId}`} className="utrecht-button utrecht-button--secondary-action">
            Annuleren
          </Link>
        </div>
      </form>
    </div>
  );
}
