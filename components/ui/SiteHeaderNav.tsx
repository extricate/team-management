"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import styles from "./SiteHeader.module.css";

const primaryLinks = [
  { href: "/dashboard",    label: "Dashboard" },
  { href: "/teams",        label: "Teams" },
  { href: "/medewerkers",  label: "Medewerkers" },
  { href: "/financiering", label: "Financiering" },
  { href: "/bestellingen", label: "Bestellingen" },
];

const secondaryLinks = [
  { href: "/organisaties",   label: "Organisaties" },
  { href: "/bedrijfspersex", label: "Bedrijfspersex" },
];

export function SiteHeaderNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const secondaryActive = secondaryLinks.some(
    (link) => pathname === link.href || pathname.startsWith(link.href + "/")
  );

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <nav aria-label="Hoofdnavigatie" className={styles.nav}>
      {primaryLinks.map((link) => {
        const active = pathname === link.href || pathname.startsWith(link.href + "/");
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`${styles.navLink}${active ? ` ${styles.navLinkActive}` : ""}`}
            aria-current={active ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}

      <div ref={wrapperRef} className={styles.meerWrapper}>
        <button
          className={`${styles.navLink} ${styles.meerButton}${secondaryActive ? ` ${styles.navLinkActive}` : ""}`}
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="menu"
        >
          Meer
          <ChevronIcon open={open} />
        </button>
        {open && (
          <div className={styles.meerDropdown} role="menu">
            {secondaryLinks.map((link) => {
              const active = pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  role="menuitem"
                  className={`${styles.meerItem}${active ? ` ${styles.meerItemActive}` : ""}`}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
