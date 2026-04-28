"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heading } from "@rijkshuisstijl-community/components-react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { formatCurrency, prorateCost } from "@/lib/utils";
import { getOPFType, getCrossCategoryConflict, CATEGORY_LABELS, CATEGORY_COLORS, type OPFNaturalCategory } from "@/lib/opf-types";
import type { FinancialTypeCategory } from "@/lib/db/schema";

interface FinancialType { id: string; type: string; year: number; }
interface Allocation { id: string; amount: string | null; status: string; }
interface SourceAmount {
  id: string;
  amount: string;
  status: string;
  financialSource: { id: string; name: string; organisation: { name: string } };
  financialType: FinancialType | null;
  allocations: Allocation[];
}
interface Position {
  id: string;
  type: string;
  opfType: string | null;
  positionCode: string | null;
  schaal: string | null;
  annualCost: string | null;
  expectedStart: string | Date | null;
  expectedEnd: string | Date | null;
}

interface Props {
  position: Position;
  teamId: string;
  teamName: string;
  availableAmounts: SourceAmount[];
  alreadyAllocated: number;
}

function CrossCategoryWarning({
  selectedCategory,
  opfKey,
  annualCost,
}: {
  selectedCategory: string | undefined;
  opfKey: string | null | undefined;
  annualCost: number;
}) {
  const conflict = getCrossCategoryConflict(selectedCategory, opfKey);
  if (conflict.kind === "none") return null;

  const isBlocking = conflict.kind === "blocks-internal-budget";
  return (
    <div style={{
      marginTop: "0.75rem",
      padding: "0.75rem 1rem",
      borderRadius: "4px",
      border: `1px solid ${isBlocking ? "var(--rvo-color-rood-300, #f5a3a3)" : "var(--rvo-color-geel-400, #e6a817)"}`,
      background: isBlocking ? "var(--rvo-color-rood-50, #fff5f5)" : "var(--rvo-color-geel-50, #fffbea)",
      fontSize: "0.875rem",
    }}>
      <strong style={{ color: isBlocking ? "var(--rvo-color-rood-700, #b30000)" : "var(--rvo-color-oranje-800, #7a3b00)" }}>
        {isBlocking ? "⚠ Budgetconflict: extern personeel uit PERSEX" : "⚠ Afwijkend budgettype"}
      </strong>
      <p style={{ margin: "0.375rem 0 0 0", color: isBlocking ? "var(--rvo-color-rood-700, #b30000)" : "var(--rvo-color-oranje-800, #7a3b00)" }}>
        {isBlocking ? (
          <>
            Dit is een externe inhuurpositie. Financiering uit het personeelsbudget (PERSEX) blokkeert structurele interne formatieplekken —
            extern personeel is doorgaans duurder per FTE dan intern personeel.
            {annualCost > 0 && (
              <> De <CurrencyDisplay value={annualCost} /> per jaar gaat af van het PERSEX-budget dat anders voor interne medewerkers beschikbaar zou zijn.</>
            )}
          </>
        ) : (
          <>
            Verwacht budgettype voor dit OPF-type is{" "}
            <strong>{conflict.expectedCategory ? CATEGORY_LABELS[conflict.expectedCategory] : "—"}</strong>,
            maar er is een{" "}
            <strong>{conflict.selectedCategory ? CATEGORY_LABELS[conflict.selectedCategory as OPFNaturalCategory] ?? conflict.selectedCategory : "—"}</strong>-bedrag geselecteerd.
            Dit is toegestaan maar afwijkend — controleer of dit bewust is.
          </>
        )}
      </p>
    </div>
  );
}

export function AllocatePositionForm({ position, teamId, teamName, availableAmounts, alreadyAllocated }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedAmountId, setSelectedAmountId] = useState(availableAmounts[0]?.id ?? "");
  const [noEndDate, setNoEndDate] = useState(false);

  const opfDef = getOPFType(position.opfType);
  const annualCost = Number(position.annualCost ?? 0);
  const selectedAmount = availableAmounts.find(a => a.id === selectedAmountId);
  const selectedYear = selectedAmount?.financialType?.year ?? new Date().getFullYear();
  const startDate = position.expectedStart ? new Date(position.expectedStart) : null;
  const endDate = position.expectedEnd ? new Date(position.expectedEnd) : null;
  const effectiveCost = annualCost > 0 ? prorateCost(annualCost, startDate, endDate, selectedYear) : 0;
  const isProrated = effectiveCost > 0 && effectiveCost < annualCost;
  const remaining = effectiveCost > 0 ? effectiveCost - alreadyAllocated : null;
  const usedOnSelected = selectedAmount
    ? selectedAmount.allocations.reduce((s, a) => s + Number(a.amount ?? 0), 0)
    : 0;
  const freeOnSelected = selectedAmount ? Number(selectedAmount.amount) - usedOnSelected : 0;

  const selectedCategory = selectedAmount?.financialType?.type as FinancialTypeCategory | undefined;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const amountStr = (fd.get("amount") as string).replace(",", ".");
    const startStr = fd.get("startDate") as string;
    const endStr = noEndDate ? "" : (fd.get("endDate") as string);

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/funding-allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          financialSourceAmountId: fd.get("financialSourceAmountId"),
          positionId: position.id,
          amount: amountStr,
          startDate: startStr ? new Date(startStr).toISOString() : undefined,
          endDate: endStr ? new Date(endStr).toISOString() : undefined,
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

  const positionLabel = `${position.type}${position.positionCode ? ` (${position.positionCode})` : ""}${position.schaal ? ` · Schaal ${position.schaal}` : ""}${opfDef ? ` · ${opfDef.label}` : ""}`;

  return (
    <div className="form-page">
      <Breadcrumbs crumbs={[
        { label: "Teams", href: "/teams" },
        { label: teamName, href: `/teams/${teamId}` },
        { label: "Positie financieren" },
      ]} />
      <Heading level={1} style={{ marginBottom: "0.5rem" }}>Positie financieren</Heading>
      <p style={{ marginBottom: "1rem", color: "var(--rvo-color-grijs-600)", fontSize: "0.9375rem" }}>
        Positie: <strong>{positionLabel}</strong>
      </p>

      {/* OPF type info */}
      {opfDef && (
        <div style={{ marginBottom: "1.5rem", padding: "0.875rem 1rem", background: "var(--rvo-color-hemelblauw-50, #eef4fb)", borderRadius: "6px", border: "1px solid var(--rvo-color-hemelblauw-200, #b3d0ec)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.375rem" }}>
            <span style={{ fontWeight: 600, fontSize: "0.9375rem" }}>{opfDef.label}</span>
            <span style={{
              borderRadius: "20px",
              padding: "0.125rem 0.625rem",
              fontSize: "0.75rem",
              fontWeight: 600,
              background: CATEGORY_COLORS[opfDef.naturalCategory].bg,
              color: CATEGORY_COLORS[opfDef.naturalCategory].text,
            }}>
              {CATEGORY_LABELS[opfDef.naturalCategory]}
            </span>
            {opfDef.isExternal && (
              <span style={{ borderRadius: "20px", padding: "0.125rem 0.625rem", fontSize: "0.75rem", fontWeight: 500, background: "var(--rvo-color-grijs-200)", color: "var(--rvo-color-grijs-700)" }}>
                Externe inhuur
              </span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--rvo-color-grijs-700)" }}>{opfDef.hint}</p>
        </div>
      )}

      {/* Cost overview */}
      {annualCost > 0 && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: isProrated ? "0.5rem" : "1.5rem" }}>
            {[
              {
                label: isProrated ? `Kosten in ${selectedYear}` : "Jaarlijkse kosten",
                value: effectiveCost,
                color: "var(--rvo-color-hemelblauw-700)",
              },
              { label: "Al gealloceerd", value: alreadyAllocated, color: "var(--rvo-color-groen-700)" },
              {
                label: "Nog te dekken",
                value: remaining!,
                color: remaining! <= 0 ? "var(--rvo-color-groen-700)" : "var(--rvo-color-oranje-600, #e17000)",
              },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: "var(--rvo-color-hemelblauw-50)", borderRadius: "4px", padding: "1rem", textAlign: "center" }}>
                <div style={{ fontSize: "1.25rem", fontWeight: 700, color }}>
                  <CurrencyDisplay value={value} />
                </div>
                <div style={{ fontSize: "0.8125rem", color: "var(--rvo-color-grijs-700)" }}>{label}</div>
              </div>
            ))}
          </div>
          {isProrated && (
            <p style={{ margin: "0 0 1.5rem 0", fontSize: "0.8125rem", color: "var(--rvo-color-grijs-600)" }}>
              Proratering op basis van startdatum: {formatCurrency(annualCost)} p.j. × deel van {selectedYear} = {formatCurrency(effectiveCost)}
            </p>
          )}
        </>
      )}

      {error && (
        <div role="alert" className="form-alert">
          <p>{error}</p>
        </div>
      )}

      {availableAmounts.length === 0 ? (
        <div className="form-alert" style={{ borderLeftColor: "var(--rvo-color-oranje-600, #e17000)", background: "var(--rvo-color-geel-100, #fff9e6)" }}>
          <p style={{ color: "var(--rvo-color-hemelblauw-800)" }}>
            Er zijn geen vrijgegeven financieringsbedragen beschikbaar voor deze organisatie.
            Voeg eerst een vrijgegeven bedrag toe via een <Link href="/financiering" className="utrecht-link">financieringsbron</Link>.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="financialSourceAmountId" className="utrecht-form-label">
              Financieringsbron <span className="form-required" aria-label="verplicht">*</span>
            </label>
            <select
              id="financialSourceAmountId"
              name="financialSourceAmountId"
              className="utrecht-select"
              required
              autoFocus
              value={selectedAmountId}
              onChange={e => setSelectedAmountId(e.target.value)}
            >
              {availableAmounts.map(a => {
                const used = a.allocations.reduce((s, al) => s + Number(al.amount ?? 0), 0);
                const free = Number(a.amount) - used;
                const typeLabel = a.financialType ? ` · ${a.financialType.type} ${a.financialType.year}` : "";
                const isPreferred = opfDef && a.financialType?.type === opfDef.naturalCategory;
                return (
                  <option key={a.id} value={a.id}>
                    {isPreferred ? "✓ " : ""}{a.financialSource.name}{typeLabel} [{a.financialSource.organisation.name}] — {formatCurrency(free)} beschikbaar
                  </option>
                );
              })}
            </select>
            {selectedAmount && (
              <p className="form-hint">
                Totaal: {formatCurrency(Number(selectedAmount.amount))} · Gealloceerd: {formatCurrency(usedOnSelected)} · Vrij: {formatCurrency(freeOnSelected)}
                {selectedAmount.financialType && (
                  <>
                    {" · "}
                    <span style={{
                      borderRadius: "10px",
                      padding: "0.0625rem 0.5rem",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      background: CATEGORY_COLORS[(selectedAmount.financialType.type as OPFNaturalCategory) ?? "PERSEX"]?.bg,
                      color: CATEGORY_COLORS[(selectedAmount.financialType.type as OPFNaturalCategory) ?? "PERSEX"]?.text,
                    }}>
                      {selectedAmount.financialType.type} {selectedAmount.financialType.year}
                    </span>
                  </>
                )}
              </p>
            )}

            <CrossCategoryWarning
              selectedCategory={selectedCategory}
              opfKey={position.opfType}
              annualCost={annualCost}
            />
          </div>

          <div className="form-field">
            <label htmlFor="amount" className="utrecht-form-label">
              Toe te wijzen bedrag (€) <span className="form-required" aria-label="verplicht">*</span>
            </label>
            <input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              className="utrecht-textbox"
              required
              placeholder="0.00"
              defaultValue={remaining && remaining > 0 ? remaining.toFixed(2) : ""}
            />
            <p className="form-hint">
              Meerdere allocaties per positie zijn mogelijk voor financiering uit meerdere bronnen.
            </p>
          </div>

          <div className="form-field">
            <label htmlFor="startDate" className="utrecht-form-label">Startdatum dekking</label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              className="utrecht-textbox"
              style={{ maxWidth: "240px" }}
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </div>

          <div className="form-field">
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
              <label htmlFor="endDate" className="utrecht-form-label" style={{ margin: 0 }}>
                Einddatum dekking
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.875rem", cursor: "pointer", fontWeight: 400 }}>
                <input
                  type="checkbox"
                  checked={noEndDate}
                  onChange={e => setNoEndDate(e.target.checked)}
                  style={{ cursor: "pointer" }}
                />
                Geen einddatum (doorlopend)
              </label>
            </div>
            {!noEndDate ? (
              <input
                id="endDate"
                name="endDate"
                type="date"
                className="utrecht-textbox"
                style={{ maxWidth: "240px" }}
              />
            ) : (
              <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--rvo-color-grijs-600)" }}>
                Dekking loopt door totdat deze handmatig wordt beëindigd. Wij plannen maximaal 15 jaar vooruit.
              </p>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="reason" className="utrecht-form-label">Toelichting</label>
            <textarea
              id="reason"
              name="reason"
              className="utrecht-textarea"
              rows={3}
              maxLength={500}
              placeholder="Optioneel: reden of context voor deze allocatie"
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="utrecht-button utrecht-button--primary-action" disabled={saving}>
              {saving ? "Opslaan..." : "Financiering koppelen"}
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
