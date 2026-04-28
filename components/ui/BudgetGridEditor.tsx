"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";

const CATEGORIES = ["PERSEX", "MATEX", "Investeringen"] as const;
type Category = (typeof CATEGORIES)[number];

interface CellState {
  typeId: string | null;
  amountId: string | null;
  amount: string;
  status: "concept" | "released";
}

type GridState = Record<string, CellState>;

export interface GridInitialEntry {
  type: Category;
  year: number;
  typeId: string;
  amountId: string | null;
  amount: string;
  status: "concept" | "released";
}

interface Props {
  sourceId: string;
  initialEntries: GridInitialEntry[];
  initialYears: number[];
}

function cellKey(type: Category, year: number) {
  return `${type}-${year}`;
}

function parseAmount(s: string): number {
  return parseFloat(s.replace(",", ".").replace(/\s/g, "")) || 0;
}

function formatGridCurrency(num: number): string {
  if (num === 0) return "";
  const abs = Math.abs(num);
  if (abs >= 1_000_000) {
    const mln = num / 1_000_000;
    return `€ ${mln.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M`;
  }
  if (abs >= 100_000) {
    return `€ ${Math.round(num / 1_000).toLocaleString("nl-NL")}k`;
  }
  return formatCurrency(num);
}

const CATEGORY_LABELS: Record<Category, string> = {
  PERSEX: "PERSEX",
  MATEX: "MATEX",
  Investeringen: "Investering",
};

const CATEGORY_HINTS: Record<Category, string> = {
  PERSEX: "Personele exploitatie",
  MATEX: "Materiële exploitatie",
  Investeringen: "Investeringen",
};

export function BudgetGridEditor({ sourceId, initialEntries, initialYears }: Props) {
  const router = useRouter();
  const currentYear = new Date().getFullYear();

  const defaultYears = useMemo(() => {
    if (initialYears.length > 0) return [...initialYears].sort((a, b) => a - b);
    return [currentYear, currentYear + 1, currentYear + 2];
  }, [initialYears, currentYear]);

  const [years, setYears] = useState<number[]>(defaultYears);

  const [cells, setCells] = useState<GridState>(() => {
    const state: GridState = {};
    for (const e of initialEntries) {
      state[cellKey(e.type, e.year)] = {
        typeId: e.typeId,
        amountId: e.amountId,
        amount: e.amount,
        status: e.status,
      };
    }
    return state;
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const getCell = useCallback(
    (type: Category, year: number): CellState =>
      cells[cellKey(type, year)] ?? { typeId: null, amountId: null, amount: "", status: "concept" },
    [cells],
  );

  const updateCell = useCallback(
    (type: Category, year: number, patch: Partial<CellState>) => {
      setCells((prev) => ({
        ...prev,
        [cellKey(type, year)]: { ...getCell(type, year), ...patch },
      }));
      setSavedMsg(null);
    },
    [getCell],
  );

  const yearTotal = useCallback(
    (year: number) =>
      CATEGORIES.reduce((sum, cat) => sum + parseAmount(getCell(cat, year).amount), 0),
    [getCell],
  );

  const rowTotal = useCallback(
    (type: Category) =>
      years.reduce((sum, yr) => sum + parseAmount(getCell(type, yr).amount), 0),
    [years, getCell],
  );

  const grandTotal = useMemo(
    () => years.reduce((sum, yr) => sum + yearTotal(yr), 0),
    [years, yearTotal],
  );

  const addYear = () => {
    const maxYear = years.length > 0 ? Math.max(...years) : currentYear;
    const next = maxYear + 1;
    if (next <= currentYear + 20) setYears((prev) => [...prev, next]);
  };

  const removeYear = (year: number) => {
    const hasData = CATEGORIES.some((cat) => parseAmount(getCell(cat, year).amount) > 0);
    if (!hasData) setYears((prev) => prev.filter((y) => y !== year));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSavedMsg(null);

    const entries: Array<{ type: string; year: number; amount: number; status: "concept" | "released" }> = [];
    for (const year of years) {
      for (const cat of CATEGORIES) {
        const cell = getCell(cat, year);
        const amount = parseAmount(cell.amount);
        if (amount > 0) entries.push({ type: cat, year, amount, status: cell.status });
      }
    }

    if (entries.length === 0) {
      setError("Voer minimaal één bedrag groter dan €0 in.");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/financial-sources/${sourceId}/budget-grid`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Er is een fout opgetreden.");
        return;
      }
      const { data } = await res.json();
      setSavedMsg(`${data.updated} budgetregels opgeslagen.`);
      router.refresh();
    } catch {
      setError("Er is een verbindingsfout opgetreden.");
    } finally {
      setSaving(false);
    }
  };

  const thStyle: React.CSSProperties = {
    textAlign: "center",
    padding: "0.5rem 0.75rem",
    background: "var(--rvo-color-hemelblauw-100, #d3e4f5)",
    fontWeight: 600,
    fontSize: "0.875rem",
    borderBottom: "2px solid var(--rvo-color-hemelblauw-300, #6baed6)",
    whiteSpace: "nowrap",
  };

  const tdStyle: React.CSSProperties = {
    padding: "0.25rem 0.5rem",
    borderBottom: "1px solid var(--rvo-color-hemelblauw-100, #d3e4f5)",
    borderRight: "1px solid var(--rvo-color-hemelblauw-100, #d3e4f5)",
    verticalAlign: "middle",
  };

  const totalTdStyle: React.CSSProperties = {
    padding: "0.5rem 0.75rem",
    textAlign: "right",
    fontWeight: 700,
    fontSize: "0.875rem",
    color: "var(--rvo-color-hemelblauw-800)",
    borderLeft: "2px solid var(--rvo-color-hemelblauw-300, #6baed6)",
  };

  return (
    <div>
      {error && (
        <div role="alert" style={{ marginBottom: "1rem", padding: "0.75rem 1rem", background: "var(--rvo-color-rood-50, #fff0f0)", border: "1px solid var(--rvo-color-rood-300, #f5a3a3)", borderRadius: "4px", color: "var(--rvo-color-rood-700, #b30000)", fontSize: "0.875rem" }}>
          {error}
        </div>
      )}
      {savedMsg && (
        <div style={{ marginBottom: "1rem", padding: "0.75rem 1rem", background: "var(--rvo-color-groen-50, #f0faf0)", border: "1px solid var(--rvo-color-groen-300, #74c476)", borderRadius: "4px", color: "var(--rvo-color-groen-800, #006400)", fontSize: "0.875rem" }}>
          ✓ {savedMsg}
        </div>
      )}

      <div style={{ overflowX: "auto", marginBottom: "0.75rem" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.875rem" }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: "left", width: "130px" }}>Categorie</th>
              {years.map((year) => {
                const isEmpty = CATEGORIES.every((cat) => parseAmount(getCell(cat, year).amount) === 0);
                return (
                  <th key={year} style={{ ...thStyle, minWidth: "150px", position: "relative" }}>
                    <span style={{ color: year === currentYear ? "var(--rvo-color-hemelblauw-700)" : undefined }}>
                      {year}
                    </span>
                    {isEmpty && years.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeYear(year)}
                        title="Leeg jaar verwijderen"
                        style={{ position: "absolute", top: "2px", right: "4px", background: "none", border: "none", cursor: "pointer", color: "var(--rvo-color-grijs-500)", fontSize: "0.75rem", lineHeight: 1, padding: "2px" }}
                      >
                        ×
                      </button>
                    )}
                  </th>
                );
              })}
              <th style={{ ...thStyle, textAlign: "right", borderLeft: "2px solid var(--rvo-color-hemelblauw-300, #6baed6)", width: "120px" }}>
                15-jr totaal
              </th>
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map((cat, idx) => {
              const rowBg = idx % 2 === 0 ? "#fff" : "var(--rvo-color-grijs-50, #f8f8f8)";
              const rTotal = rowTotal(cat);
              return (
                <tr key={cat} style={{ background: rowBg }}>
                  <td style={{ ...tdStyle, fontWeight: 600, paddingLeft: "0.75rem", borderLeft: "1px solid var(--rvo-color-hemelblauw-100, #d3e4f5)" }}>
                    <div>{CATEGORY_LABELS[cat]}</div>
                    <div style={{ fontWeight: 400, fontSize: "0.75rem", color: "var(--rvo-color-grijs-600)" }}>{CATEGORY_HINTS[cat]}</div>
                  </td>
                  {years.map((year) => {
                    const cell = getCell(cat, year);
                    const isReleased = cell.status === "released";
                    return (
                      <td key={year} style={{ ...tdStyle, background: isReleased ? "var(--rvo-color-groen-50, #f0faf0)" : rowBg }}>
                        <input
                          type="number"
                          step="1000"
                          min="0"
                          value={cell.amount}
                          onChange={(e) => updateCell(cat, year, { amount: e.target.value })}
                          placeholder="0"
                          aria-label={`${cat} ${year} bedrag`}
                          style={{
                            width: "100%",
                            border: "1px solid var(--rvo-color-grijs-300)",
                            borderRadius: "3px",
                            padding: "0.375rem 0.5rem",
                            fontSize: "0.875rem",
                            textAlign: "right",
                            background: "transparent",
                            outline: "none",
                          }}
                        />
                        <div style={{ marginTop: "0.25rem", textAlign: "right" }}>
                          <button
                            type="button"
                            onClick={() => updateCell(cat, year, { status: isReleased ? "concept" : "released" })}
                            title={isReleased ? "Klik om terug te zetten naar concept" : "Klik om vrij te geven"}
                            style={{
                              fontSize: "0.6875rem",
                              padding: "0.125rem 0.5rem",
                              borderRadius: "10px",
                              border: "none",
                              cursor: "pointer",
                              background: isReleased ? "var(--rvo-color-groen-600, #2ca02c)" : "var(--rvo-color-grijs-300, #cccccc)",
                              color: isReleased ? "#fff" : "var(--rvo-color-grijs-700)",
                              fontWeight: 500,
                              transition: "background 0.15s",
                            }}
                          >
                            {isReleased ? "Vrijgegeven" : "Concept"}
                          </button>
                        </div>
                      </td>
                    );
                  })}
                  <td style={{ ...tdStyle, ...totalTdStyle }}>
                    {rTotal > 0 ? formatGridCurrency(rTotal) : <span style={{ color: "var(--rvo-color-grijs-400)" }}>—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: "var(--rvo-color-hemelblauw-50, #eef4fb)" }}>
              <td style={{ ...tdStyle, fontWeight: 700, paddingLeft: "0.75rem", borderTop: "2px solid var(--rvo-color-hemelblauw-300)", borderLeft: "1px solid var(--rvo-color-hemelblauw-100)" }}>
                Totaal per jaar
              </td>
              {years.map((year) => {
                const yt = yearTotal(year);
                return (
                  <td key={year} style={{ ...tdStyle, textAlign: "right", fontWeight: 700, borderTop: "2px solid var(--rvo-color-hemelblauw-300)" }}>
                    {yt > 0 ? formatGridCurrency(yt) : <span style={{ color: "var(--rvo-color-grijs-400)" }}>—</span>}
                  </td>
                );
              })}
              <td style={{ ...tdStyle, ...totalTdStyle, borderTop: "2px solid var(--rvo-color-hemelblauw-300)" }}>
                {grandTotal > 0 ? formatGridCurrency(grandTotal) : "—"}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button
            type="button"
            onClick={addYear}
            disabled={years.length > 0 && Math.max(...years) >= currentYear + 20}
            className="utrecht-button utrecht-button--secondary-action"
            style={{ fontSize: "0.8125rem" }}
          >
            + Jaar toevoegen
          </button>
          <span style={{ fontSize: "0.75rem", color: "var(--rvo-color-grijs-500)" }}>
            Velden van €0 worden overgeslagen. Status per cel toggelbaar.
          </span>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="utrecht-button utrecht-button--primary-action"
        >
          {saving ? "Opslaan…" : "Budget opslaan"}
        </button>
      </div>
    </div>
  );
}
