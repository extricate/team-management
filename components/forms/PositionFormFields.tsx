"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Alert } from "@rijkshuisstijl-community/components-react";
import { FunctieCombobox, type FunctieOption } from "@/components/ui/FunctieCombobox";
import { OPF_TYPES, getOPFType, CATEGORY_LABELS, CATEGORY_BADGE_COLOR } from "@/lib/opf-types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency } from "@/lib/utils";
import { isSentinel } from "@/lib/functies";

export type { FunctieOption };

export interface PositionSubmitData {
  functieId: string | null;
  roltitel: string | null;
  opfType: string | null;
  positionCode: string | null;
  schaal: string | null;
  annualCost: number | null;
  status: string;
  expectedStart: string | null;
  expectedEnd: string | null;
  requiredBefore: string | null;
}

export interface PositionInitialValues {
  functieId?: string | null;
  roltitel?: string | null;
  opfType?: string | null;
  positionCode?: string | null;
  schaal?: string | null;
  annualCost?: string | null;
  status?: string;
  expectedStart?: Date | string | null;
  expectedEnd?: Date | string | null;
  requiredBefore?: Date | string | null;
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

interface Props {
  functies: FunctieOption[];
  initialValues?: PositionInitialValues;
  onSubmit: (data: PositionSubmitData) => void | Promise<void>;
  saving: boolean;
  error: string | null;
  submitLabel: string;
  cancelHref: string;
  /** Extra fields rendered at the top of the form (e.g. organisationId select) */
  children?: React.ReactNode;
}

export function PositionFormFields({
  functies,
  initialValues,
  onSubmit,
  saving,
  error,
  submitLabel,
  cancelHref,
  children,
}: Props) {
  const initFunctie = initialValues?.functieId
    ? functies.find(f => f.id === initialValues.functieId)
    : undefined;
  const initIsNB = isSentinel(initFunctie);
  const shouldLoadOnMount = !!(initialValues?.functieId && initFunctie && !initIsNB && initFunctie.schaalCode);

  const [selectedFunctieId, setSelectedFunctieId] = useState<string>(initialValues?.functieId ?? "");
  const [roltitel, setRoltitel] = useState<string>(initialValues?.roltitel ?? "");
  const [selectedOpfType, setSelectedOpfType] = useState<string>(initialValues?.opfType ?? "");
  const [positionCode, setPositionCode] = useState<string>(initialValues?.positionCode ?? "");
  const [status, setStatus] = useState<string>(initialValues?.status ?? "gepland");
  const [expectedStartStr, setExpectedStartStr] = useState<string>(toDateInput(initialValues?.expectedStart));
  const [expectedEndStr, setExpectedEndStr] = useState<string>(toDateInput(initialValues?.expectedEnd));
  const [requiredBeforeStr, setRequiredBeforeStr] = useState<string>(toDateInput(initialValues?.requiredBefore));

  // For "Niet beschikbaar": manual schaal + cost inputs.
  // For regular functies: schaalCode is derived from functie.schaalCode (read-only).
  const [manualSchaal, setManualSchaal] = useState<string>(initIsNB ? (initialValues?.schaal ?? "") : "");
  const [annualCost, setAnnualCost] = useState<string>(initIsNB ? (initialValues?.annualCost ?? "") : "");
  const [schaalInfo, setSchaalInfo] = useState<SchaalInfo | null>(null);
  const [schaalInfoLoading, setSchaalInfoLoading] = useState(shouldLoadOnMount);
  const [functieError, setFunctieError] = useState<string | null>(null);

  const selectedFunctie = functies.find(f => f.id === selectedFunctieId) ?? null;
  const isNietBeschikbaar = isSentinel(selectedFunctie);
  const opfDef = getOPFType(selectedOpfType);

  async function lookupSchaalCost(code: string, dateStr: string) {
    if (!code.trim()) {
      setSchaalInfo(null);
      setAnnualCost("");
      return;
    }
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
        setAnnualCost("");
      }
    } catch {
      setSchaalInfo(null);
      setAnnualCost("");
    } finally {
      setSchaalInfoLoading(false);
    }
  }

  // On mount: if editing a regular functie that has a schaalCode, auto-lookup.
  useEffect(() => {
    if (!shouldLoadOnMount || !initFunctie?.schaalCode) return;
    const code = initFunctie.schaalCode;
    const dateStr = toDateInput(initialValues?.expectedStart);
    const year = dateStr ? new Date(dateStr).getFullYear() : new Date().getFullYear();
    fetch(`/api/salarisschalen/lookup?schaal=${encodeURIComponent(code.trim())}&year=${year}`)
      .then(res => res.ok ? res.json() : null)
      .then(body => {
        if (body) {
          setSchaalInfo(body.data);
          setAnnualCost(String(body.data.totalCost));
        }
      })
      .catch(() => {})
      .finally(() => setSchaalInfoLoading(false));
    // intentional mount-only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFunctieChange(id: string) {
    setSelectedFunctieId(id);
    setFunctieError(null);
    const functie = functies.find(f => f.id === id);
    const nextIsNB = isSentinel(functie);
    setSchaalInfo(null);
    setAnnualCost("");
    if (!nextIsNB && functie?.schaalCode) {
      lookupSchaalCost(functie.schaalCode, expectedStartStr);
    }
    if (nextIsNB) {
      setManualSchaal("");
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedFunctieId) {
      setFunctieError("Selecteer een functie.");
      return;
    }

    const costStr = annualCost.replace(",", ".");
    const schaal = isNietBeschikbaar ? (manualSchaal || null) : (selectedFunctie?.schaalCode ?? null);

    await onSubmit({
      functieId: selectedFunctieId || null,
      roltitel: isNietBeschikbaar ? roltitel || null : null,
      opfType: selectedOpfType || null,
      positionCode: positionCode || null,
      schaal,
      annualCost: costStr ? parseFloat(costStr) : null,
      status,
      expectedStart: expectedStartStr ? new Date(expectedStartStr).toISOString() : null,
      expectedEnd: expectedEndStr ? new Date(expectedEndStr).toISOString() : null,
      requiredBefore: requiredBeforeStr ? new Date(requiredBeforeStr).toISOString() : null,
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {children}

      {error && (
        <div role="alert" className="form-alert">
          <p>{error}</p>
        </div>
      )}

      {/* Functie */}
      <div className="form-field">
        <label htmlFor="functieId" className="utrecht-form-label">
          Functie <span className="form-required" aria-label="verplicht">*</span>
        </label>
        <FunctieCombobox
          id="functieId"
          functies={functies}
          value={selectedFunctieId}
          onChange={handleFunctieChange}
        />
        {functieError && (
          <p className="form-hint" style={{ color: "var(--rvo-color-rood-600, #c0392b)" }}>
            {functieError}
          </p>
        )}
        <p className="form-hint">
          Staat de benodigde functie er niet bij?{" "}
          <a href="/beheer/functies/nieuw" className="utrecht-link" target="_blank" rel="noopener noreferrer">
            Voeg een nieuwe functie toe
          </a>{" "}
          en ververs daarna deze pagina.
        </p>
      </div>

      {/* Roltitel — only when "Niet beschikbaar" is selected */}
      {isNietBeschikbaar && (
        <div className="form-field">
          <label htmlFor="roltitel" className="utrecht-form-label">
            Roltitel <span className="form-required" aria-label="verplicht">*</span>
          </label>
          <input
            id="roltitel"
            name="roltitel"
            type="text"
            className="utrecht-textbox"
            required
            maxLength={200}
            value={roltitel}
            onChange={e => setRoltitel(e.target.value)}
            autoFocus
            placeholder="bijv. Product Owner, Agile Coach"
          />
          <p className="form-hint">Tijdelijke roltitel voor een nog niet geformaliseerde functie.</p>
        </div>
      )}

      {/* OPF-type */}
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

      {/* Positiecode */}
      <div className="form-field" style={{ maxWidth: "20rem" }}>
        <label htmlFor="positionCode" className="utrecht-form-label">Positiecode</label>
        <input
          id="positionCode"
          name="positionCode"
          type="text"
          className="utrecht-textbox"
          maxLength={50}
          value={positionCode}
          onChange={e => setPositionCode(e.target.value)}
          placeholder="bijv. P-2025-047"
        />
      </div>

      {/* Schaal + kosten: manual inputs only for "Niet beschikbaar" */}
      {isNietBeschikbaar && (
        <>
          <div className="form-field" style={{ maxWidth: "20rem" }}>
            <label htmlFor="schaal" className="utrecht-form-label">Schaal</label>
            <input
              id="schaal"
              name="schaal"
              type="text"
              className="utrecht-textbox"
              maxLength={20}
              value={manualSchaal}
              onChange={e => setManualSchaal(e.target.value)}
              onBlur={() => lookupSchaalCost(manualSchaal, expectedStartStr)}
              placeholder="bijv. 10, 12, KOL, LTKOL"
            />
            <p className="form-hint">
              {schaalInfoLoading ? "Kosten ophalen…" : "Handmatig invullen voor niet-geformaliseerde rollen."}
            </p>
          </div>

          <div className="form-field" style={{ maxWidth: "20rem" }}>
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
            <p className="form-hint">
              Totale jaarlijkse kosten incl. werkgeverslasten{opfDef?.isExternal ? " (extern tarief)" : ""}. Kan handmatig worden overschreven.
            </p>
          </div>
        </>
      )}

      {/* Schaal-info: read-only breakdown for regular functies */}
      {!isNietBeschikbaar && selectedFunctieId && (
        <div className="form-field">
          {schaalInfoLoading && <p className="form-hint">Kosten ophalen…</p>}
          {schaalInfo && !schaalInfoLoading && (
            <Alert type="info">
              <div style={{ fontSize: "0.875rem" }}>
                <p style={{ margin: "0 0 0.25rem", fontWeight: 600 }}>
                  Schaal {selectedFunctie?.schaalCode}
                  {!schaalInfo.isExact && (
                    <span style={{ fontWeight: "normal", marginLeft: "0.5rem", color: "var(--rvo-color-oranje-700)" }}>
                      (geen exacte match voor {expectedStartStr ? new Date(expectedStartStr).getFullYear() : "dit jaar"} — gebaseerd op {schaalInfo.foundYear})
                    </span>
                  )}
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.2rem 1rem" }}>
                  <span>Primaire kosten:</span><span>{formatCurrency(schaalInfo.primaryCost)}</span>
                  <span>2e-orde-effecten:</span><span>{formatCurrency(schaalInfo.secondaryEffects)}</span>
                  <span>3e-orde-effecten:</span><span>{formatCurrency(schaalInfo.tertiaryEffects)}</span>
                  <strong>Totaal:</strong><strong>{formatCurrency(schaalInfo.totalCost)}</strong>
                </div>
              </div>
            </Alert>
          )}
          {!schaalInfo && !schaalInfoLoading && selectedFunctie && !selectedFunctie.schaalCode && (
            <p className="form-hint">Geen schaal gekoppeld aan deze functie.</p>
          )}
        </div>
      )}

      {/* Status */}
      <div className="form-field" style={{ maxWidth: "20rem" }}>
        <label htmlFor="status" className="utrecht-form-label">
          Status <span className="form-required" aria-label="verplicht">*</span>
        </label>
        <select
          id="status"
          name="status"
          className="utrecht-select"
          required
          value={status}
          onChange={e => setStatus(e.target.value)}
        >
          <option value="gepland">Gepland</option>
          <option value="gewenst">Gewenst</option>
          <option value="toegezegd">Toegezegd</option>
          <option value="open">Open (vacature)</option>
          <option value="gevuld">Bezet</option>
          <option value="gesloten">Gesloten</option>
        </select>
      </div>

      {/* Dates */}
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
              // Re-lookup cost when start year changes (affects which salary table is used)
              const schaalToUse = isNietBeschikbaar ? manualSchaal : (selectedFunctie?.schaalCode ?? "");
              if (schaalToUse) lookupSchaalCost(schaalToUse, e.target.value);
            }}
            style={{ maxWidth: "100%" }}
          />
        </div>
        <div className="form-field">
          <label htmlFor="expectedEnd" className="utrecht-form-label">Verwachte einddatum</label>
          <input
            id="expectedEnd"
            name="expectedEnd"
            type="date"
            className="utrecht-textbox"
            value={expectedEndStr}
            onChange={e => setExpectedEndStr(e.target.value)}
            style={{ maxWidth: "100%" }}
          />
        </div>
        <div className="form-field">
          <label htmlFor="requiredBefore" className="utrecht-form-label">Vereist vóór</label>
          <input
            id="requiredBefore"
            name="requiredBefore"
            type="date"
            className="utrecht-textbox"
            value={requiredBeforeStr}
            onChange={e => setRequiredBeforeStr(e.target.value)}
            style={{ maxWidth: "100%" }}
          />
          <p className="form-hint">Uiterste datum voor invulling van de positie.</p>
        </div>
      </div>

      {/* Actions */}
      <div className="form-actions">
        <button type="submit" className="utrecht-button utrecht-button--primary-action" disabled={saving}>
          {saving ? "Opslaan..." : submitLabel}
        </button>
        <Link href={cancelHref} className="utrecht-button utrecht-button--secondary-action">
          Annuleren
        </Link>
      </div>
    </form>
  );
}
