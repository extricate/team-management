import Link from "next/link";
import { signOut } from "@/lib/auth";
import styles from "./SiteHeader.module.css";

interface SiteHeaderProps { userName?: string; }

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/teams", label: "Teams" },
  { href: "/medewerkers", label: "Medewerkers" },
];

export function SiteHeader({ userName }: SiteHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.colorBand} aria-hidden="true" />
      <div className={styles.inner}>
        <Link href="/" className={styles.logo}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <rect width="32" height="32" rx="2" fill="#F9B000" />
            <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#154273">RO</text>
          </svg>
          <span className={styles.logoText}>Teambeheer</span>
        </Link>
        <nav aria-label="Hoofdnavigatie" className={styles.nav}>
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className={styles.navLink}>{link.label}</Link>
          ))}
        </nav>
        <div className={styles.userArea}>
          {userName ? (
            <>
              <span>{userName}</span>
              <form className={styles.signOutForm} action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
                <button type="submit">Uitloggen</button>
              </form>
            </>
          ) : (
            <Link href="/inloggen" className={styles.navLink}>Inloggen</Link>
          )}
        </div>
      </div>
    </header>
  );
}
