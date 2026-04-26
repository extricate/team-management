import Link from "next/link";
import { signOut } from "@/lib/auth";
import styles from "./SiteHeader.module.css";
import { SiteHeaderNav } from "./SiteHeaderNav";

interface SiteHeaderProps { userName?: string; }

export function SiteHeader({ userName }: SiteHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.colorBand} aria-hidden="true" />
      <div className={styles.inner}>
        <Link href="/" className={styles.logo} aria-label="Teambeheer — naar startpagina">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false">
            <rect width="32" height="32" rx="2" fill="#F9B000" />
            <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#154273">RO</text>
          </svg>
          <span className={styles.logoText}>Teambeheer</span>
        </Link>
        <SiteHeaderNav />
        <div className={styles.userArea}>
          {userName ? (
            <>
              <span className={styles.userName} aria-label={`Ingelogd als ${userName}`}>{userName}</span>
              <form
                className={styles.signOutForm}
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
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
