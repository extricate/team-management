interface Props {
  label: string;
  column: string;
  currentSort: string;
  currentOrder: "asc" | "desc";
  buildHref: (column: string, order: "asc" | "desc") => string;
}

export function SortHeader({ label, column, currentSort, currentOrder, buildHref }: Props) {
  const isActive = currentSort === column;
  const nextOrder: "asc" | "desc" = isActive && currentOrder === "asc" ? "desc" : "asc";
  const icon = isActive ? (currentOrder === "asc" ? " ↑" : " ↓") : " ↕";

  return (
    <th className="utrecht-table__header-cell" style={{ whiteSpace: "nowrap" }}>
      <a
        href={buildHref(column, nextOrder)}
        style={{
          textDecoration: "none",
          color: "inherit",
          display: "inline-flex",
          alignItems: "center",
          gap: "0.25rem",
          fontWeight: isActive ? 700 : undefined,
        }}
      >
        {label}
        <span style={{ fontSize: "0.75rem", opacity: isActive ? 1 : 0.4 }}>{icon}</span>
      </a>
    </th>
  );
}
