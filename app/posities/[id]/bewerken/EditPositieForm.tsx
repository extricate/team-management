"use client";

import { useState } from "react";
import Link from "next/link";
import { Heading, Alert } from "@rijkshuisstijl-community/components-react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { useApiSubmit } from "@/lib/hooks/useApiSubmit";
import type { Position } from "@/lib/db/schema";
import { OPF_TYPES, getOPFType, CATEGORY_LABELS, CATEGORY_BADGE_COLOR } from "@/lib/opf-types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency } from "@/lib/utils";

interface Props {
  position: Position;
}

interface SchaalInfo {
  primaryCost: number;
  secondaryEffects: number;
  tertiaryEffects: number;
  totalCost: number;
  isExact: boolean;
  foundYear: number;
}

function toDateInput(val: Date | string | null | undefined): string {
  if (!val) return "";
  const d = typeof val === "string" ? new Date(val) : val;
  return d.toISOString().slice(0, 10);
}

export function EditPositieForm({ position }: Props) {
  const { error, saving, submit } = useApiSubmit(`/api/positions/${position.id}`, "PATCH", {
    redirectTo: `/posities/${position.id}`,
  });
  const [selectedOpfType, setSelectedOpfType] = useState<string>(position.opfType ?? "");
  const [schaalCode, setSchaalCode] = useState<string>(position.schaal ?? "");
  const [expectedStartStr, setExpectedStartStr] = useState<string>(toDateInput(position.expectedStart));
  const [annualCost, setAnnualCost] = useState<string>(position.annualCost ?? "");
  const [schaalInfo, setSchaalInfo] = useState<SchaalInfo | null>(null);
  const [schaalInfoLoading, setSchaalInfoLoading] = useState(false);

  const opfDef = getOPFType(selectedOpfType);

  async function lookupSchaalCost(code: string, dateStr: string) {
    if (!code.trim()) { setSchaalInfo(null); return; }
    const year = dateStr ? new Date(dateStr).getFullYear() : new Date().getFullYear();
    setSchaalInfoLoading(true);
    try {
      const res = await fetch(`/api/salarisschalen/lookup?schaal=${encodeURIComponent(code.trim())}&year=${year}`);
      if (res.ok) {
        const body = await res.json();
        setSchaalInfo(body.data);
        setAnnualCost(String(body.data.totalCost));
      } else {
        setSchaalInfo(null);
      }
    } catch {
      setSchaalInfo(null);
    } finally {
      setSchaalInfoLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const startStr = fd.get("expectedStart") as string;
    const endStr = fd.get("expectedEnd") as string;
    const requiredBeforeStr = fd.get("requiredBefore") as string;
    const costStr = annualCost.replace(",", ".");
    await submit({
      type: fd.get("type"),
      opfType: (fd.get("opfType") as string) || null,
      positionCode: (fd.get("positionCode") as string) || null,
      schaal: schaalCode || null,
      annualCost: costStr ? parseFloat(costStr) : null,
      status: fd.get("status"),
      expectedStart: startStr ? new Date(startStr).toISOString() : null,
      expectedEnd: endStr ? new Date(endStr).toISOString() : null,
      requiredBefore: requiredBeforeStr ? new Date(requiredBeforeStr).toISOString() : null,
    });
  }

  return (
    <div className="form-page">
      <Breadcrumbs crumbs={[
        { label: "Posities", href: "/posities" },
        { label: position.type, href: `/posities/${position.id}` },
        { label: "Bewerken" },
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
            defaultValue={position.type}
            placeholder="bijv. Product Owner, Scrum Master, Teamleider"
          />
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
            <p className="form-hint">Bepaalt het verwachte budgettype voor financieringscontroles.</p>
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
              maxLength={20}
              value={schaalCode}
              onChange={e => setSchaalCode(e.target.value)}
              onBlur={() => lookupSchaalCost(schaalCode, expectedStartStr)}
              placeholder="bijv. 10, 12, KOL, LTKOL"
            />
            <p className="form-hint">
              {schaalInfoLoading ? "Kosten ophalen…" : "Standaardkosten worden automatisch opgehaald."}
            </p>
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
            value={annualCost}
            onChange={e => setAnnualCost(e.target.value)}
            placeholder="0.00"
          />
          {schaalInfo && (
            <Alert type="info" style={{ marginTop: "0.5rem" }}>
              <div style={{ fontSize: "0.875rem" }}>
                {!schaalInfo.isExact && (
                  <p style={{ marginBottom: "0.5rem", color: "var(--rvo-color-oranje-700)" }}>
                    Geen exacte match voor het startjaar — kosten gebaseerd op {schaalInfo.foundYear}.
                  </p>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.2rem 1rem" }}>
                  <span>Primaire kosten:</span><span>{formatCurrency(schaalInfo.primaryCost)}</span>
                  <span>2e-orde-effecten:</span><span>{formatCurrency(schaalInfo.secondaryEffects)}</span>
                  <span>3e-orde-effecten:</span><span>{formatCurrency(schaalInfo.tertiaryEffects)}</span>
                  <strong>Totaal:</strong><strong>{formatCurrency(schaalInfo.totalCost)}</strong>
                </div>
              </div>
            </Alert>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="status" className="utrecht-form-label">
            Status <span className="form-required" aria-label="verplicht">*</span>
          </label>
          <select id="status" name="status" className="utrecht-select" required defaultValue={position.status}>
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
            <input
              id="expectedStart"
              name="expectedStart"
              type="date"
              className="utrecht-textbox"
              value={expectedStartStr}
              onChange={e => {
                setExpectedStartStr(e.target.value);
                if (schaalCode) lookupSchaalCost(schaalCode, e.target.value);
              }}
              style={{ maxWidth: "100%" }}
            />
          </div>
          <div className="form-field">
            <label htmlFor="expectedEnd" className="utrecht-form-label">Verwachte einddatum</label>
            <input id="expectedEnd" name="expectedEnd" type="date" className="utrecht-textbox" defaultValue={toDateInput(position.expectedEnd)} style={{ maxWidth: "100%" }} />
          </div>
          <div className="form-field">
            <label htmlFor="requiredBefore" className="utrecht-form-label">Vereist vóór</label>
            <input id="requiredBefore" name="requiredBefore" type="date" className="utrecht-textbox" defaultValue={toDateInput(position.requiredBefore)} style={{ maxWidth: "100%" }} />
            <p className="form-hint">Uiterste datum voor invulling.</p>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="utrecht-button utrecht-button--primary-action" disabled={saving}>
            {saving ? "Opslaan..." : "Wijzigingen opslaan"}
          </button>
          <Link href={`/posities/${position.id}`} className="utrecht-button utrecht-button--secondary-action">
            Annuleren
          </Link>
        </div>
      </form>
    </div>
  );
}
