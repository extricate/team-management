import Link from "next/link";
import styles from "./Breadcrumbs.module.css";

export interface Crumb { label: string; href?: string; }

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Kruimelpad" className={styles.nav}>
      <ol className={styles.list}>
        <li className={styles.item}>
          <Link href="/dashboard" className={styles.link}>Home</Link>
        </li>
        {crumbs.map((crumb, i) => (
          <li key={i} className={styles.item}>
            {crumb.href
              ? <Link href={crumb.href} className={styles.link}>{crumb.label}</Link>
              : <span aria-current="page" className={styles.current}>{crumb.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
