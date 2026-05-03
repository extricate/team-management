"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import styles from "./SearchBar.module.css";

interface SearchResult {
  type: string;
  typeLabel: string;
  id: string;
  title: string;
  subtitle: string;
  url: string;
}

const INDEX_ORDER = [
  "employees",
  "teams",
  "organisations",
  "financial-sources",
  "positions",
];

export function SearchBar() {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const router = useRouter();

  // Auto-focus when expanding
  useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  // Ctrl+K → expand and focus
  useEffect(() => {
    function onKeydown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setExpanded(true);
      }
    }
    document.addEventListener("keydown", onKeydown);
    return () => document.removeEventListener("keydown", onKeydown);
  }, []);

  // Click outside → collapse + clear
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        collapse();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function collapse() {
    setExpanded(false);
    setOpen(false);
    setQuery("");
    setResults([]);
  }

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) return;
      const { data } = await res.json() as { data: { results: SearchResult[] } };
      setResults(data.results ?? []);
      setOpen(true);
      setActiveIndex(-1);
    } catch {
      // network error
    } finally {
      setLoading(false);
    }
  }, []);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q), 250);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex(i => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      const target = flatResults[activeIndex];
      if (target) navigate(target.url);
    } else if (e.key === "Escape") {
      collapse();
    }
  }

  function navigate(url: string) {
    router.push(url);
    collapse();
  }

  const grouped = INDEX_ORDER
    .map(type => ({
      type,
      label: results.find(r => r.type === type)?.typeLabel ?? type,
      items: results.filter(r => r.type === type),
    }))
    .filter(g => g.items.length > 0);

  const flatResults = grouped.flatMap(g => g.items);

  return (
    <div className={`${styles.container}${expanded ? ` ${styles.containerExpanded}` : ""}`} ref={containerRef}>
      {!expanded ? (
        <button
          className={styles.iconButton}
          onClick={() => setExpanded(true)}
          aria-label="Zoeken openen (Ctrl+K)"
          title="Zoeken (Ctrl+K)"
        >
          <SearchIcon />
        </button>
      ) : (
        <div className={styles.inputWrapper}>
          <SearchIcon className={styles.searchIcon} />
          <input
            ref={inputRef}
            type="search"
            className={styles.input}
            placeholder="Zoeken…"
            value={query}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onFocus={() => results.length > 0 && setOpen(true)}
            aria-label="Zoeken"
            aria-expanded={open}
            aria-autocomplete="list"
            role="combobox"
            autoComplete="off"
          />
          {loading && <div className={styles.spinner} aria-hidden="true" />}
        </div>
      )}

      {open && flatResults.length > 0 && (
        <div className={styles.dropdown} role="listbox" aria-label="Zoekresultaten">
          {grouped.map(group => (
            <div key={group.type} className={styles.group}>
              <div className={styles.groupLabel} aria-hidden="true">{group.label}</div>
              {group.items.map(result => {
                const idx = flatResults.indexOf(result);
                return (
                  <button
                    key={result.id}
                    type="button"
                    role="option"
                    aria-selected={idx === activeIndex}
                    className={`${styles.result}${idx === activeIndex ? ` ${styles.resultActive}` : ""}`}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => navigate(result.url)}
                  >
                    <span className={styles.resultTitle}>{result.title}</span>
                    {result.subtitle && (
                      <span className={styles.resultSubtitle}>{result.subtitle}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {open && query.trim() && flatResults.length === 0 && !loading && (
        <div className={styles.dropdown}>
          <div className={styles.noResults}>Geen resultaten voor &ldquo;{query}&rdquo;</div>
        </div>
      )}
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}
