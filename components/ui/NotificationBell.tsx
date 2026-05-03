"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import type { PositionConflict } from "@/lib/dashboard";
import styles from "./NotificationBell.module.css";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [conflicts, setConflicts] = useState<PositionConflict[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.data?.conflicts)) setConflicts(data.data.conflicts);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const count = conflicts.length;

  const lateStart = conflicts.filter((c) => c.type === "late_start");
  const unfunded = conflicts.filter((c) => c.type === "unfunded");

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <button
        className={styles.bell}
        onClick={() => setOpen((o) => !o)}
        aria-label={count > 0 ? `${count} conflicten` : "Geen conflicten"}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <BellIcon />
        {count > 0 && (
          <span className={styles.badge} aria-hidden="true">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className={styles.dropdown} role="dialog" aria-label="Conflicten">
          <div className={styles.header}>
            {count === 0 ? "Geen conflicten" : `Conflicten (${count})`}
          </div>

          {count === 0 ? (
            <div className={styles.empty}>Alles ziet er goed uit.</div>
          ) : (
            <div className={styles.list}>
              {lateStart.map((c) => (
                <div key={`late-${c.positionId}`} className={`${styles.item} ${styles.itemRed}`}>
                  <span className={styles.itemLabel}>Late start</span>
                  <Link href={`/teams/${c.teamId}`} className={styles.teamLink} onClick={() => setOpen(false)}>
                    {c.teamName}
                  </Link>
                  <span className={styles.itemType}>{c.positionType}</span>
                </div>
              ))}
              {unfunded.map((c) => (
                <div key={`unfunded-${c.positionId}`} className={`${styles.item} ${styles.itemYellow}`}>
                  <span className={styles.itemLabel}>Niet gefinancierd</span>
                  <Link href={`/teams/${c.teamId}`} className={styles.teamLink} onClick={() => setOpen(false)}>
                    {c.teamName}
                  </Link>
                  <span className={styles.itemType}>{c.positionType}</span>
                </div>
              ))}
            </div>
          )}

          <div className={styles.footer}>
            <Link href="/dashboard" className={styles.footerLink} onClick={() => setOpen(false)}>
              Naar dashboard →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function BellIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
