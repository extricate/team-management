"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heading } from "@rijkshuisstijl-community/components-react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";

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
interface Bestelling { id: string; atbNummer: string; geraamdBedrag: string | null; }

interface Props {
  bestelling: Bestelling;
  availableAmounts: SourceAmount[];
  alreadyAllocated: number;
}

export function AllocateBestellingForm({ bestelling, availableAmounts, alreadyAllocated }: Props) {
  const router = useRouter();
  const [selectedAmountId, setSelectedAmountId] = useState<string>("");
  const [amountInput, setAmountInput] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedAmount = availableAmounts.find(a => a.id === selectedAmountId);
  const totalBudget = selectedAmount ? Number(selectedAmount.amount) : 0;
  const alreadyUsed = selectedAmount
    ? selectedAmount.allocations.filter(a => a.status === "active").reduce((s, a) => s + Number(a.amount ?? 0), 0)
    : 0;
  const remainingBudget = totalBudget - alreadyUsed;
  const geraamd = Number(bestelling.geraamdBedrag ?? 0);
  const remaining = geraamd - alreadyAllocated;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedAmountId) { setError("Kies een financieringsbron."); return; }
    if (!amountInput || Number(amountInput) <= 0) { setError("Voer een geldig bedrag in."); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/funding-allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          financialSourceAmountId: selectedAmountId,
          bestellingId: bestelling.id,
          amount: amountInput,
          reason: reason || undefined,
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

  return (
    <div className="form-page">
      <Breadcrumbs crumbs={[
        { label: "Bestellingen", href: "/bestellingen" },
        { label: bestelling.atbNummer, href: `/bestellingen/${bestelling.id}` },
        { label: "Financieren" },
      ]} />
      <Heading level={1} style={{ marginBottom: "0.5rem" }}>Bestelling financieren</Heading>
      <p style={{ marginBottom: "1.5rem", color: "var(--rvo-color-grijs-600)" }}>
        Koppel een MATEX- of Investeringenbron aan {bestelling.atbNummer}.
      </p>

      {bestelling.geraamdBedrag && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, max-content)", gap: "2rem", marginBottom: "1.5rem", padding: "1rem", background: "var(--rvo-color-grijs-100)", borderRadius: "4px" }}>
          <div>
            <div style={{ fontSize: "0.8125rem", color: "var(--rvo-color-grijs-600)", marginBottom: "0.25rem" }}>Geraamd</div>
            <div style={{ fontWeight: 700 }}><CurrencyDisplay value={geraamd} /></div>
          </div>
          <div>
            <div style={{ fontSize: "0.8125rem", color: "var(--rvo-color-grijs-600)", marginBottom: "0.25rem" }}>Al gealloceerd</div>
            <div style={{ fontWeight: 700 }}><CurrencyDisplay value={alreadyAllocated} /></div>
          </div>
          <div>
            <div style={{ fontSize: "0.8125rem", color: "var(--rvo-color-grijs-600)", marginBottom: "0.25rem" }}>Nog te financieren</div>
            <div style={{ fontWeight: 700, color: remaining < 0 ? "var(--rvo-color-rood)" : undefined }}><CurrencyDisplay value={remaining} /></div>
          </div>
        </div>
      )}

      {error && (
        <div role="alert" className="form-alert">
          <p>{error}</p>
        </div>
      )}

      {availableAmounts.length === 0 ? (
        <p style={{ color: "var(--rvo-color-grijs-600)" }}>
          Geen vrijgegeven MATEX- of Investeringenbedragen beschikbaar.{" "}
          <Link href="/financiering/nieuw" className="utrecht-link">Maak een financieringsbron aan →</Link>
        </p>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="sourceAmountId" className="utrecht-form-label">
              Financieringsbron (MATEX / Investeringen) <span className="form-required" aria-label="verplicht">*</span>
            </label>
            <select
              id="sourceAmountId"
              name="sourceAmountId"
              className="utrecht-select"
              required
              value={selectedAmountId}
              onChange={e => setSelectedAmountId(e.target.value)}
            >
              <option value="">— Kies een bedrag —</option>
              {availableAmounts.map(a => {
                const used = a.allocations.filter(al => al.status === "active").reduce((s, al) => s + Number(al.amount ?? 0), 0);
                const avail = Number(a.amount) - used;
                const label = `${a.financialSource.name} – ${a.type?.type ?? "?"} ${a.type?.year ?? ""} (beschikbaar: €${avail.toLocaleString("nl-NL")})`;
                return <option key={a.id} value={a.id}>{label}</option>;
              })}
            </select>

            {selectedAmount && (
              <p className="form-hint" style={{ marginTop: "0.5rem" }}>
                Beschikbaar in dit bedrag: <strong><CurrencyDisplay value={remainingBudget} /></strong>
                {" "}({selectedAmount.type?.type} {selectedAmount.type?.year}, {selectedAmount.financialSource.organisation.name})
              </p>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="amount" className="utrecht-form-label">
              Toe te wijzen bedrag <span className="form-required" aria-label="verplicht">*</span>
            </label>
            <input
              id="amount"
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              className="utrecht-textbox"
              style={{ maxWidth: "200px" }}
              value={amountInput}
              onChange={e => setAmountInput(e.target.value)}
              placeholder="bijv. 15000"
            />
            {remaining > 0 && (
              <button type="button" className="utrecht-link" style={{ marginLeft: "0.75rem", cursor: "pointer", background: "none", border: "none", padding: 0 }}
                onClick={() => setAmountInput(String(Math.min(remaining, remainingBudget).toFixed(2)))}>
                Vul resterend bedrag in (€{Math.min(remaining, remainingBudget).toLocaleString("nl-NL")})
              </button>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="reason" className="utrecht-form-label">Reden / toelichting</label>
            <input id="reason" name="reason" type="text" className="utrecht-textbox" value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Optionele toelichting voor het auditlog" />
          </div>

          <div className="form-actions">
            <button type="submit" className="utrecht-button utrecht-button--primary-action" disabled={saving}>
              {saving ? "Opslaan..." : "Financiering koppelen"}
            </button>
            <Link href={`/bestellingen/${bestelling.id}`} className="utrecht-button utrecht-button--secondary-action">Annuleren</Link>
          </div>
        </form>
      )}
    </div>
  );
}
