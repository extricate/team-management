"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { filterFuncties } from "@/lib/functie-search";
import { NIET_BESCHIKBAAR_TITEL } from "@/lib/functies";

export interface FunctieOption {
  id: string;
  titel: string;
  schaalCode: string | null;
  isActive?: boolean;
}

interface Props {
  functies: FunctieOption[];
  value: string;
  onChange: (id: string) => void;
  id?: string;
}

function sortWithSentinelFirst(items: FunctieOption[]): FunctieOption[] {
  const sentinel = items.find(f => f.titel === NIET_BESCHIKBAAR_TITEL);
  const rest = items.filter(f => f.titel !== NIET_BESCHIKBAAR_TITEL);
  return sentinel ? [sentinel, ...rest] : rest;
}

export function FunctieCombobox({ functies, value, onChange, id }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = functies.find(f => f.id === value);

  const filtered = query.trim()
    ? filterFuncties(functies, query)
    : sortWithSentinelFirst(functies);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 0);

    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open, close]);

  return (
    <div ref={containerRef} className="functie-combobox">
      <button
        type="button"
        id={id}
        className="functie-combobox__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        <span className={selected ? undefined : "functie-combobox__placeholder"}>
          {selected ? selected.titel : "— Selecteer functie —"}
        </span>
        <span className="functie-combobox__arrow" aria-hidden="true">
          <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 1l5 6 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </button>

      {open && (
        <div className="functie-combobox__panel">
          <input
            ref={inputRef}
            type="text"
            placeholder="Zoek functie..."
            className="functie-combobox__search"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <ul className="functie-combobox__list" role="listbox" aria-label="Functies">
            {filtered.length === 0 && (
              <li className="functie-combobox__empty">Geen functies gevonden.</li>
            )}
            {filtered.map(f => (
              <li
                key={f.id}
                role="option"
                aria-selected={f.id === value}
                className={[
                  "functie-combobox__item",
                  f.isActive === false ? "functie-combobox__item--inactive" : "",
                ].join(" ").trim()}
                data-active={f.id === value ? "" : undefined}
                onPointerDown={e => {
                  e.preventDefault();
                  onChange(f.id);
                  close();
                }}
              >
                <span style={{ flex: 1 }}>{f.titel}</span>
                {f.schaalCode && (
                  <span style={{ marginLeft: "0.75rem", color: "var(--rvo-color-grijs-600, #5a5a5a)", fontSize: "0.8125rem", flexShrink: 0 }}>
                    Schaal {f.schaalCode}
                  </span>
                )}
                {f.isActive === false && (
                  <span className="functie-combobox__inactive-badge">(inactief)</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
