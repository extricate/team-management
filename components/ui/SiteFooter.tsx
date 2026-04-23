import Link from "next/link";
import styles from "./SiteFooter.module.css";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.columns}>
          <div className={styles.column}>
            <h3>Teambeheer</h3>
            <ul>
              <li><Link href="/dashboard">Dashboard</Link></li>
              <li><Link href="/teams">Teams</Link></li>
              <li><Link href="/medewerkers">Medewerkers</Link></li>
            </ul>
          </div>
          <div className={styles.column}>
            <h3>Ondersteuning</h3>
            <ul>
              <li><Link href="/help">Helpcentrum</Link></li>
              <li><Link href="/contact">Contact</Link></li>
            </ul>
          </div>
          <div className={styles.column}>
            <h3>Overheid</h3>
            <ul>
              <li><a href="https://www.rijksoverheid.nl" target="_blank" rel="noopener noreferrer">Rijksoverheid.nl</a></li>
              <li><Link href="/toegankelijkheid">Toegankelijkheidsverklaring</Link></li>
              <li><Link href="/privacy">Privacyverklaring</Link></li>
            </ul>
          </div>
        </div>
        <div className={styles.bottom}>
          <p>© {year} Rijksoverheid — Teambeheer applicatie</p>
        </div>
      </div>
    </footer>
  );
}
