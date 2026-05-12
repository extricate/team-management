"use client";

import { useState } from "react";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency } from "@/lib/utils";

interface BudgetRow { id: string; year: number; amount: string; status: "concept" | "released"; }
interface Props { budgets: BudgetRow[]; }

export function BedrijfspersexBudgetEditor({ budgets: initial }: Props) {
  const [budgets, setBudgets] = useState(initial);
  const [newYear, setNewYear] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function addYear() {
    const year = parseInt(newYear, 10);
    const amount = parseFloat(newAmount.replace(",", "."));
    if (!year || isNaN(amount) || amount < 0) { setError("Voer een geldig jaar en bedrag in."); return; }
    setSaving("new"); setError(null);
    try {
      const res = await fetch("/api/company-persex", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, amount }),
      });
      if (!res.ok) { const b = await res.json(); setError(b.error ?? "Fout bij opslaan."); return; }
      const { data } = await res.json();
      setBudgets(prev => [...prev, { id: data.id, year: data.year, amount: data.amount, status: data.status }].sort((a, b) => a.year - b.year));
      setNewYear(""); setNewAmount("");
    } catch { setError("Verbindingsfout."); }
    finally { setSaving(null); }
  }

  async function updateBudget(id: string, patch: { amount?: number; status?: "concept" | "released" }) {
    setSaving(id); setError(null);
    try {
      const res = await fetch(`/api/company-persex/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) { const b = await res.json(); setError(b.error ?? "Fout bij opslaan."); return; }
      const { data } = await res.json();
      setBudgets(prev => prev.map(b => b.id === id ? { ...b, amount: data.amount, status: data.status } : b));
    } catch { setError("Verbindingsfout."); }
    finally { setSaving(null); }
  }

  return (
    <div>
      {error && <div role="alert" className="form-alert" style={{ marginBottom: "1rem" }}><p>{error}</p></div>}

      <table className="utrecht-table" style={{ width: "100%", borderCollapse: "collapse", marginBottom: "1.5rem" }}>
        <thead className="utrecht-table__header">
          <tr className="utrecht-table__row">
            <th className="utrecht-table__header-cell">Jaar</th>
            <th className="utrecht-table__header-cell">Maximum (zacht plafond)</th>
            <th className="utrecht-table__header-cell">Status</th>
            <th className="utrecht-table__header-cell">Acties</th>
          </tr>
        </thead>
        <tbody className="utrecht-table__body">
          {budgets.length === 0 && (
            <tr className="utrecht-table__row">
              <td className="utrecht-table__cell" colSpan={4} style={{ textAlign: "center", padding: "1.5rem", color: "var(--rvo-color-grijs-600)" }}>
                Nog geen jaren aangemaakt.
              </td>
            </tr>
          )}
          {budgets.map(b => (
            <BudgetRowEditor
              key={b.id}
              budget={b}
              saving={saving === b.id}
              onSave={(patch) => updateBudget(b.id, patch)}
            />
          ))}
        </tbody>
      </table>

      {/* Add new year */}
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end", flexWrap: "wrap" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.8125rem", marginBottom: "0.25rem", color: "var(--rvo-color-grijs-700)" }}>Jaar</label>
          <input
            type="number"
            className="utrecht-textbox"
            style={{ width: "100px" }}
            placeholder={String(new Date().getFullYear())}
            value={newYear}
            onChange={e => setNewYear(e.target.value)}
            min={2000}
            max={2100}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.8125rem", marginBottom: "0.25rem", color: "var(--rvo-color-grijs-700)" }}>Maximum (€)</label>
          <input
            type="number"
            className="utrecht-textbox"
            style={{ width: "160px" }}
            placeholder="0.00"
            value={newAmount}
            onChange={e => setNewAmount(e.target.value)}
            min={0}
            step="0.01"
          />
        </div>
        <button
          className="utrecht-button utrecht-button--primary-action"
          onClick={addYear}
          disabled={saving === "new"}
        >
          {saving === "new" ? "Opslaan..." : "+ Jaar toevoegen"}
        </button>
      </div>
    </div>
  );
}

function BudgetRowEditor({
  budget,
  saving,
  onSave,
}: {
  budget: BudgetRow;
  saving: boolean;
  onSave: (patch: { amount?: number; status?: "concept" | "released" }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(Math.round(Number(budget.amount))));

  function commit() {
    const amount = parseFloat(draft.replace(",", "."));
    if (!isNaN(amount) && amount >= 0) onSave({ amount });
    setEditing(false);
  }

  return (
    <tr className="utrecht-table__row">
      <td className="utrecht-table__cell"><strong>{budget.year}</strong></td>
      <td className="utrecht-table__cell" style={{ minWidth: "200px" }}>
        {editing ? (
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <input
              type="number"
              className="utrecht-textbox"
              style={{ width: "140px" }}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              min={0}
              step="1"
              autoFocus
            />
            <button className="utrecht-button utrecht-button--primary-action" style={{ fontSize: "0.8125rem" }} onClick={commit} disabled={saving}>
              {saving ? "…" : "OK"}
            </button>
            <button className="utrecht-button utrecht-button--secondary-action" style={{ fontSize: "0.8125rem" }} onClick={() => { setDraft(String(Math.round(Number(budget.amount)))); setEditing(false); }}>
              Annuleren
            </button>
          </div>
        ) : (
          <button
            className="utrecht-link"
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: "inherit" }}
            onClick={() => setEditing(true)}
            title="Klik om te bewerken"
          >
            <CurrencyDisplay value={budget.amount} />
          </button>
        )}
      </td>
      <td className="utrecht-table__cell">
        <StatusBadge label={budget.status} color={budget.status === "released" ? "green" : "grey"} />
      </td>
      <td className="utrecht-table__cell">
        <button
          className="utrecht-link"
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: "0.875rem" }}
          onClick={() => onSave({ status: budget.status === "concept" ? "released" : "concept" })}
          disabled={saving}
        >
          {budget.status === "concept" ? "Vrijgeven" : "Terugzetten naar concept"}
        </button>
      </td>
    </tr>
  );
}
