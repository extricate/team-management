"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heading } from "@rijkshuisstijl-community/components-react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import type { Position } from "@/lib/db/schema";
import { OPF_TYPES, getOPFType, CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/opf-types";

interface Props {
  position: Position;
  teamId: string;
  teamName: string;
}

function toDateInput(val: Date | string | null | undefined): string {
  if (!val) return "";
  const d = typeof val === "string" ? new Date(val) : val;
  return d.toISOString().slice(0, 10);
}

export function EditPositionForm({ position, teamId, teamName }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedType, setSelectedType] = useState<string>(position.type);

  const opfDef = getOPFType(selectedType);
  const isLegacyType = !opfDef && !!selectedType;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const startStr = fd.get("expectedStart") as string;
    const endStr = fd.get("expectedEnd") as string;
    const costStr = (fd.get("annualCost") as string).replace(",", ".");

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/positions/${position.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: fd.get("type"),
          positionCode: (fd.get("positionCode") as string) || null,
          schaal: (fd.get("schaal") as string) || null,
          annualCost: costStr ? parseFloat(costStr) : null,
          status: fd.get("status"),
          expectedStart: startStr ? new Date(startStr).toISOString() : null,
          expectedEnd: endStr ? new Date(endStr).toISOString() : null,
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
        { label: "Positie bewerken" },
      ]} />
      <Heading level={1} style={{ marginBottom: "1.5rem" }}>Positie bewerken</Heading>

      {error && (
        <div role="alert" className="form-alert">
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="type" className="utrecht-form-label">
            OPF-type <span className="form-required" aria-label="verplicht">*</span>
          </label>
          <select
            id="type"
            name="type"
            className="utrecht-select"
            required
            autoFocus
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
          >
            {/* Preserve legacy value if not in the standard list */}
            {isLegacyType && (
              <option value={position.type}>{position.type} (huidig – niet-standaard)</option>
            )}
            {OPF_TYPES.map(t => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
          {opfDef ? (
            <div style={{ marginTop: "0.5rem", padding: "0.625rem 0.875rem", background: "var(--rvo-color-hemelblauw-50, #eef4fb)", borderRadius: "4px", fontSize: "0.875rem", display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
              <span style={{
                flexShrink: 0,
                borderRadius: "20px",
                padding: "0.125rem 0.625rem",
                fontSize: "0.75rem",
                fontWeight: 600,
                background: CATEGORY_COLORS[opfDef.naturalCategory].bg,
                color: CATEGORY_COLORS[opfDef.naturalCategory].text,
              }}>
                {CATEGORY_LABELS[opfDef.naturalCategory]}
              </span>
              <span style={{ color: "var(--rvo-color-grijs-700)" }}>{opfDef.hint}</span>
            </div>
          ) : isLegacyType ? (
            <p className="form-hint" style={{ color: "var(--rvo-color-oranje-700, #b35900)" }}>
              Dit type is niet-standaard. Overweeg om over te stappen naar een OPF-type voor correcte financieringsberekeningen.
            </p>
          ) : null}
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
              defaultValue={position.positionCode ?? ""}
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
              defaultValue={position.schaal ?? ""}
              placeholder="bijv. 8, 10, 12"
            />
            <p className="form-hint">Salarisschaal voor deze positie.</p>
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
            defaultValue={position.annualCost ?? ""}
            placeholder="0.00"
          />
          <p className="form-hint">Totale jaarlijkse kosten incl. werkgeverslasten{opfDef?.isExternal ? " (extern tarief)" : ""}.</p>
        </div>

        <div className="form-field">
          <label htmlFor="status" className="utrecht-form-label">
            Status <span className="form-required" aria-label="verplicht">*</span>
          </label>
          <select id="status" name="status" className="utrecht-select" required defaultValue={position.status}>
            <option value="planned">Gepland</option>
            <option value="open">Open (vacature)</option>
            <option value="filled">Bezet</option>
            <option value="closed">Gesloten</option>
          </select>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div className="form-field">
            <label htmlFor="expectedStart" className="utrecht-form-label">Verwachte startdatum</label>
            <input id="expectedStart" name="expectedStart" type="date" className="utrecht-textbox" defaultValue={toDateInput(position.expectedStart)} style={{ maxWidth: "100%" }} />
          </div>
          <div className="form-field">
            <label htmlFor="expectedEnd" className="utrecht-form-label">Verwachte einddatum</label>
            <input id="expectedEnd" name="expectedEnd" type="date" className="utrecht-textbox" defaultValue={toDateInput(position.expectedEnd)} style={{ maxWidth: "100%" }} />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="utrecht-button utrecht-button--primary-action" disabled={saving}>
            {saving ? "Opslaan..." : "Wijzigingen opslaan"}
          </button>
          <Link href={`/teams/${teamId}`} className="utrecht-button utrecht-button--secondary-action">
            Annuleren
          </Link>
        </div>
      </form>
    </div>
  );
}
