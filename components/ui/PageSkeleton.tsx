import styles from "./PageSkeleton.module.css";

function Block({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={[styles.block, className].filter(Boolean).join(" ")} style={style} />;
}

function TableSkeleton() {
  const headerWidths = [100, 80, 70, 90, 55];
  const rows: number[][] = [
    [145, 85, 70, 95, 55],
    [110, 90, 55, 80, 55],
    [165, 75, 80, 70, 55],
    [130, 85, 65, 80, 55],
    [125, 80, 75, 90, 55],
    [155, 70, 60, 95, 55],
  ];

  return (
    <table className={styles.table} aria-hidden="true">
      <thead className={styles.thead}>
        <tr>
          {headerWidths.map((w, i) => (
            <th key={i} className={styles.th}>
              <Block className={styles.thBlock} style={{ width: w }} />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((cols, i) => (
          <tr key={i} className={styles.tr}>
            {cols.map((w, j) => (
              <td key={j} className={styles.td}>
                <Block className={styles.tdBlock} style={{ width: w }} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DetailSkeleton() {
  const fields: Array<{ labelWidth: number; valueWidth: number }> = [
    { labelWidth: 80,  valueWidth: 160 },
    { labelWidth: 110, valueWidth: 220 },
    { labelWidth: 70,  valueWidth: 180 },
    { labelWidth: 95,  valueWidth: 140 },
    { labelWidth: 80,  valueWidth: 200 },
    { labelWidth: 100, valueWidth: 170 },
  ];

  return (
    <div className={styles.detailGrid} aria-hidden="true">
      {fields.map(({ labelWidth, valueWidth }, i) => (
        <div key={i}>
          <Block className={styles.fieldLabel} style={{ width: labelWidth }} />
          <Block className={styles.fieldValue} style={{ width: valueWidth }} />
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton({ variant = "table" }: { variant?: "table" | "detail" }) {
  return (
    <div aria-busy="true" aria-label="Pagina wordt geladen">
      <Block className={styles.breadcrumb} />
      <div className={styles.headingRow}>
        <Block className={styles.heading} />
        {variant === "table" && (
          <div className={styles.actions}>
            <Block className={styles.actionBtn} />
          </div>
        )}
      </div>
      {variant === "table" ? <TableSkeleton /> : <DetailSkeleton />}
    </div>
  );
}
