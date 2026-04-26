"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./SiteHeader.module.css";

const navLinks = [
  { href: "/dashboard",    label: "Dashboard" },
  { href: "/organisaties", label: "Organisaties" },
  { href: "/teams",        label: "Teams" },
  { href: "/medewerkers",  label: "Medewerkers" },
  { href: "/financiering", label: "Financiering" },
];

export function SiteHeaderNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Hoofdnavigatie" className={styles.nav}>
      {navLinks.map((link) => {
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
  );
}
