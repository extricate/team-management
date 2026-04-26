"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heading } from "@rijkshuisstijl-community/components-react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { formatCurrency } from "@/lib/utils";

interface FinancialType { id: string; type: string; year: number; }
interface Allocation { id: string; amount: string | null; status: string; }
interface SourceAmount {
  id: string;
  amount: string;
  status: string;
  financialSource: { id: string; name: string };
  financialType: FinancialType | null;
  allocations: Allocation[];
}
interface Position {
  id: string;
  type: string;
  positionCode: string | null;
  schaal: string | null;
  annualCost: string | null;
}

interface Props {
  position: Position;
  teamId: string;
  teamName: string;
  availableAmounts: SourceAmount[];
  alreadyAllocated: number;
}

export function AllocatePositionForm({ position, teamId, teamName, availableAmounts, alreadyAllocated }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedAmountId, setSelectedAmountId] = useState(availableAmounts[0]?.id ?? "");

  const annualCost = Number(position.annualCost ?? 0);
  const remaining = annualCost > 0 ? annualCost - alreadyAllocated : null;

  const selectedAmount = availableAmounts.find(a => a.id === selectedAmountId);
  const usedOnSelected = selectedAmount
    ? selectedAmount.allocations.reduce((s, a) => s + Number(a.amount ?? 0), 0)
    : 0;
  const freeOnSelected = selectedAmount ? Number(selectedAmount.amount) - usedOnSelected : 0;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const amountStr = (fd.get("amount") as string).replace(",", ".");
    const startStr = fd.get("startDate") as string;
    const endStr = fd.get("endDate") as string;

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

  const positionLabel = `${position.type}${position.positionCode ? ` (${position.positionCode})` : ""}${position.schaal ? ` · Schaal ${position.schaal}` : ""}`;

  return (
    <div className="form-page">
      <Breadcrumbs crumbs={[
        { label: "Teams", href: "/teams" },
        { label: teamName, href: `/teams/${teamId}` },
        { label: "Positie financieren" },
      ]} />
      <Heading level={1} style={{ marginBottom: "0.5rem" }}>Positie financieren</Heading>
      <p style={{ marginBottom: "1.5rem", color: "var(--rvo-color-grijs-600)", fontSize: "0.9375rem" }}>
        Positie: <strong>{positionLabel}</strong>
      </p>

      {/* Cost overview */}
      {annualCost > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
          {[
            { label: "Jaarlijkse kosten", value: formatCurrency(annualCost), color: "var(--rvo-color-hemelblauw-700)" },
            { label: "Al gealloceerd", value: formatCurrency(alreadyAllocated), color: "var(--rvo-color-groen-700)" },
            {
              label: "Nog te dekken",
              value: formatCurrency(remaining!),
              color: remaining! <= 0 ? "var(--rvo-color-groen-700)" : "var(--rvo-color-oranje-600, #e17000)",
            },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: "var(--rvo-color-hemelblauw-50)", borderRadius: "4px", padding: "1rem", textAlign: "center" }}>
              <div style={{ fontSize: "1.25rem", fontWeight: 700, color }}>{value}</div>
              <div style={{ fontSize: "0.8125rem", color: "var(--rvo-color-grijs-700)" }}>{label}</div>
            </div>
          ))}
        </div>
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
                return (
                  <option key={a.id} value={a.id}>
                    {a.financialSource.name}{typeLabel} — {formatCurrency(free)} beschikbaar
                  </option>
                );
              })}
            </select>
            {selectedAmount && (
              <p className="form-hint">
                Totaal bedrag: {formatCurrency(Number(selectedAmount.amount))} · Reeds gealloceerd: {formatCurrency(usedOnSelected)} · Vrij: {formatCurrency(freeOnSelected)}
              </p>
            )}
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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-field">
              <label htmlFor="startDate" className="utrecht-form-label">Startdatum dekking</label>
              <input
                id="startDate"
                name="startDate"
                type="date"
                className="utrecht-textbox"
                style={{ maxWidth: "100%" }}
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div className="form-field">
              <label htmlFor="endDate" className="utrecht-form-label">Einddatum dekking</label>
              <input
                id="endDate"
                name="endDate"
                type="date"
                className="utrecht-textbox"
                style={{ maxWidth: "100%" }}
              />
            </div>
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
