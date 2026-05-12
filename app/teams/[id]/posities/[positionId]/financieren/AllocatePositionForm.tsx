"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heading } from "@rijkshuisstijl-community/components-react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { formatCurrency, prorateCost } from "@/lib/utils";
import { getOPFType, getCrossCategoryConflict, CATEGORY_LABELS, CATEGORY_COLORS, type OPFNaturalCategory } from "@/lib/opf-types";
import { calcUtilizationPercent } from "@/lib/financial-conflicts";
import type { FinancialTypeCategory } from "@/lib/db/schema";

interface FinancialType { id: string; type: string; year: number; }
interface Allocation { id: string; amount: string | null; status: string; }
interface SourceAmount {
  id: string;
  amount: string;
  status: string;
  financialSource: { id: string; name: string; organisation: { name: string } };
  type: FinancialType | null;
  allocations: Allocation[];
}
interface PersexBudget {
  id: string;
  year: number;
  amount: string;
  status: "concept" | "released";
  allocated: number;
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
  persexBudgets: PersexBudget[];
  alreadyAllocated: number;
}

type FundingMode = "source" | "persex";

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
      marginTop: "0.75rem", padding: "0.75rem 1rem", borderRadius: "4px",
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
            Dit is een externe inhuurpositie. Financiering uit het personeelsbudget (PERSEX) blokkeert structurele interne formatieplekken.
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

export function AllocatePositionForm({ position, teamId, teamName, availableAmounts, persexBudgets, alreadyAllocated }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<FundingMode>("source");
  const [selectedAmountId, setSelectedAmountId] = useState(availableAmounts[0]?.id ?? "");
  const [selectedPersexId, setSelectedPersexId] = useState(persexBudgets[0]?.id ?? "");
  const [noEndDate, setNoEndDate] = useState(false);

  const opfDef = getOPFType(position.opfType);
  const annualCost = Number(position.annualCost ?? 0);
  const selectedAmount = availableAmounts.find(a => a.id === selectedAmountId);
  const selectedPersex = persexBudgets.find(b => b.id === selectedPersexId);
  const selectedYear = mode === "source"
    ? (selectedAmount?.type?.year ?? new Date().getFullYear())
    : (selectedPersex?.year ?? new Date().getFullYear());
  const startDate = position.expectedStart ? new Date(position.expectedStart) : null;
  const endDate = position.expectedEnd ? new Date(position.expectedEnd) : null;
  const effectiveCost = annualCost > 0 ? prorateCost(annualCost, startDate, endDate, selectedYear) : 0;
  const isProrated = effectiveCost > 0 && effectiveCost < annualCost;
  const remaining = effectiveCost > 0 ? effectiveCost - alreadyAllocated : null;
  const usedOnSelected = selectedAmount
    ? selectedAmount.allocations.reduce((s, a) => s + Number(a.amount ?? 0), 0)
    : 0;
  const freeOnSelected = selectedAmount ? Number(selectedAmount.amount) - usedOnSelected : 0;
  const selectedCategory = selectedAmount?.type?.type as FinancialTypeCategory | undefined;

  const persexPct = selectedPersex
    ? calcUtilizationPercent(selectedPersex.allocated, Number(selectedPersex.amount))
    : 0;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const amountStr = (fd.get("amount") as string).replace(",", ".");
    const startStr = fd.get("startDate") as string;
    const endStr = noEndDate ? "" : (fd.get("endDate") as string);

    setSaving(true);
    setError(null);
    try {
      const body = mode === "persex"
        ? {
            companyPersexBudgetId: selectedPersexId,
            positionId: position.id,
            amount: amountStr,
            startDate: startStr ? new Date(startStr).toISOString() : undefined,
            endDate: endStr ? new Date(endStr).toISOString() : undefined,
            reason: (fd.get("reason") as string) || undefined,
          }
        : {
            financialSourceAmountId: fd.get("financialSourceAmountId"),
            positionId: position.id,
            amount: amountStr,
            startDate: startStr ? new Date(startStr).toISOString() : undefined,
            endDate: endStr ? new Date(endStr).toISOString() : undefined,
            reason: (fd.get("reason") as string) || undefined,
          };

      const res = await fetch("/api/funding-allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const b = await res.json();
        setError(b.error ?? "Er is een fout opgetreden.");
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
  const hasNoSources = availableAmounts.length === 0;
  const hasNoPersex = persexBudgets.length === 0;

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
            <span style={{ borderRadius: "20px", padding: "0.125rem 0.625rem", fontSize: "0.75rem", fontWeight: 600, background: CATEGORY_COLORS[opfDef.naturalCategory].bg, color: CATEGORY_COLORS[opfDef.naturalCategory].text }}>
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
              { label: isProrated ? `Kosten in ${selectedYear}` : "Jaarlijkse kosten", value: effectiveCost, color: "var(--rvo-color-hemelblauw-700)" },
              { label: "Al gealloceerd", value: alreadyAllocated, color: "var(--rvo-color-groen-700)" },
              { label: "Nog te dekken", value: remaining!, color: remaining! <= 0 ? "var(--rvo-color-groen-700)" : "var(--rvo-color-oranje-600, #e17000)" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: "var(--rvo-color-hemelblauw-50)", borderRadius: "4px", padding: "1rem", textAlign: "center" }}>
                <div style={{ fontSize: "1.25rem", fontWeight: 700, color }}><CurrencyDisplay value={value} /></div>
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

      {error && <div role="alert" className="form-alert"><p>{error}</p></div>}

      {/* Mode tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", borderBottom: "2px solid var(--rvo-color-hemelblauw-200, #b3d0ec)" }}>
        {(["source", "persex"] as FundingMode[]).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            style={{
              background: "none", border: "none", cursor: "pointer", padding: "0.5rem 1rem",
              fontWeight: mode === m ? 700 : 400,
              color: mode === m ? "var(--rvo-color-hemelblauw-700)" : "var(--rvo-color-grijs-700)",
              borderBottom: mode === m ? "3px solid var(--rvo-color-hemelblauw-700)" : "3px solid transparent",
              marginBottom: "-2px", fontSize: "0.9375rem",
            }}
          >
            {m === "source" ? "Financieringsbron" : "Bedrijfspersex"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {mode === "source" ? (
          hasNoSources ? (
            <div className="form-alert" style={{ borderLeftColor: "var(--rvo-color-oranje-600, #e17000)", background: "var(--rvo-color-geel-100, #fff9e6)" }}>
              <p style={{ color: "var(--rvo-color-hemelblauw-800)" }}>
                Er zijn geen vrijgegeven financieringsbedragen beschikbaar.
                Voeg eerst een vrijgegeven bedrag toe via een <Link href="/financiering" className="utrecht-link">financieringsbron</Link>.
              </p>
            </div>
          ) : (
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
                  const typeLabel = a.type ? ` · ${a.type.type} ${a.type.year}` : "";
                  const isPreferred = opfDef && a.type?.type === opfDef.naturalCategory;
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
                  {selectedAmount.type && (
                    <>
                      {" · "}
                      <span style={{ borderRadius: "10px", padding: "0.0625rem 0.5rem", fontSize: "0.75rem", fontWeight: 600, background: CATEGORY_COLORS[(selectedAmount.type.type as OPFNaturalCategory) ?? "PERSEX"]?.bg, color: CATEGORY_COLORS[(selectedAmount.type.type as OPFNaturalCategory) ?? "PERSEX"]?.text }}>
                        {selectedAmount.type.type} {selectedAmount.type.year}
                      </span>
                    </>
                  )}
                </p>
              )}
              <CrossCategoryWarning selectedCategory={selectedCategory} opfKey={position.opfType} annualCost={annualCost} />
            </div>
          )
        ) : (
          hasNoPersex ? (
            <div className="form-alert" style={{ borderLeftColor: "var(--rvo-color-oranje-600, #e17000)", background: "var(--rvo-color-geel-100, #fff9e6)" }}>
              <p style={{ color: "var(--rvo-color-hemelblauw-800)" }}>
                Er zijn nog geen bedrijfspersex-budgetjaren aangemaakt.
                Ga naar <Link href="/bedrijfspersex" className="utrecht-link">Bedrijfspersex</Link> om het budget in te stellen.
              </p>
            </div>
          ) : (
            <div className="form-field">
              <label htmlFor="persexBudgetId" className="utrecht-form-label">
                Bedrijfspersex jaar <span className="form-required" aria-label="verplicht">*</span>
              </label>
              <select
                id="persexBudgetId"
                className="utrecht-select"
                value={selectedPersexId}
                onChange={e => setSelectedPersexId(e.target.value)}
                autoFocus
              >
                {persexBudgets.map(b => {
                  const pct = calcUtilizationPercent(b.allocated, Number(b.amount));
                  return (
                    <option key={b.id} value={b.id}>
                      {b.year} — {pct}% benut van {formatCurrency(Number(b.amount))}
                    </option>
                  );
                })}
              </select>
              {selectedPersex && (
                <div style={{ marginTop: "0.5rem", padding: "0.625rem 0.875rem", background: "var(--rvo-color-lila-50, #f5f2fc)", border: "1px solid var(--rvo-color-lila-200, #c9b8ef)", borderRadius: "4px", fontSize: "0.875rem" }}>
                  <strong style={{ color: "var(--rvo-color-lila-700, #4b2c8a)" }}>Bedrijfspersex {selectedPersex.year}</strong>
                  {" — "}
                  <span style={{ color: persexPct > 100 ? "var(--rvo-color-rood-600)" : persexPct > 80 ? "var(--rvo-color-oranje-600, #e17000)" : "var(--rvo-color-grijs-700)" }}>
                    <strong>{persexPct}%</strong> benut ({formatCurrency(selectedPersex.allocated)} van {formatCurrency(Number(selectedPersex.amount))})
                  </span>
                  {" · "}
                  <span style={{ color: "var(--rvo-color-grijs-600)" }}>Overschrijding is toegestaan.</span>
                </div>
              )}
            </div>
          )
        )}

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
          <p className="form-hint">Meerdere allocaties per positie zijn mogelijk voor financiering uit meerdere bronnen.</p>
        </div>

        <div className="form-field">
          <label htmlFor="startDate" className="utrecht-form-label">Startdatum dekking</label>
          <input id="startDate" name="startDate" type="date" className="utrecht-textbox" style={{ maxWidth: "240px" }} defaultValue={new Date().toISOString().slice(0, 10)} />
        </div>

        <div className="form-field">
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <label htmlFor="endDate" className="utrecht-form-label" style={{ margin: 0 }}>Einddatum dekking</label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.875rem", cursor: "pointer", fontWeight: 400 }}>
              <input type="checkbox" checked={noEndDate} onChange={e => setNoEndDate(e.target.checked)} style={{ cursor: "pointer" }} />
              Geen einddatum (doorlopend)
            </label>
          </div>
          {!noEndDate ? (
            <input id="endDate" name="endDate" type="date" className="utrecht-textbox" style={{ maxWidth: "240px" }} />
          ) : (
            <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--rvo-color-grijs-600)" }}>
              Dekking loopt door totdat deze handmatig wordt beëindigd.
            </p>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="reason" className="utrecht-form-label">Toelichting</label>
          <textarea id="reason" name="reason" className="utrecht-textarea" rows={3} maxLength={500} placeholder="Optioneel: reden of context voor deze allocatie" />
        </div>

        {(mode === "source" && !hasNoSources) || (mode === "persex" && !hasNoPersex) ? (
          <div className="form-actions">
            <button type="submit" className="utrecht-button utrecht-button--primary-action" disabled={saving}>
              {saving ? "Opslaan..." : "Financiering koppelen"}
            </button>
            <Link href={`/teams/${teamId}`} className="utrecht-button utrecht-button--secondary-action">Annuleren</Link>
          </div>
        ) : null}
      </form>
    </div>
  );
}
