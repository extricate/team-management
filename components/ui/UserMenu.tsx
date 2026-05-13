"use client";

import { useState, useRef, useEffect } from "react";
import { getInitials } from "@/lib/utils";
import styles from "./UserMenu.module.css";
import { usePathname } from "next/navigation";
import Link from "next/link";

interface UserMenuProps {
  userName?: string;
  onLogout: () => Promise<void>;
}

const userNavLinks = [
  { href: "/instellingen", label: "Instellingen" },
]

export function UserMenu({ userName, onLogout }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

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

  const initials = userName ? getInitials(userName) : "?";
  const pathname = usePathname();

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <button
        className={styles.avatar}
        onClick={() => setOpen((o) => !o)}
        aria-label={userName ? `Accountmenu voor ${userName}` : "Accountmenu"}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        {initials}
      </button>

      {open && (
        <div className={styles.dropdown} role="dialog" aria-label="Accountmenu">
          {userName && (
            <div className={styles.name} aria-label={`Ingelogd als ${userName}`}>
              {userName}
            </div>
          )}
          <nav aria-label="Gebruikersmenu navigatie">
            {userNavLinks.map((link) => {
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
          </nav>

          <form action={onLogout} className={styles.logoutForm}>
            <button type="submit" className={styles.logoutButton}>
              Uitloggen
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
