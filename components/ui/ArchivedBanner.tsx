import { formatDate } from "@/lib/utils";

interface Props {
  deletedAt: Date;
  entityLabel?: string;
}

export function ArchivedBanner({ deletedAt, entityLabel }: Props) {
  return (
    <div
      role="status"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.75rem 1rem",
        marginBottom: "1.5rem",
        borderRadius: "6px",
        border: "1px solid var(--rvo-color-oranje-300, #f0a830)",
        background: "var(--rvo-color-geel-50, #fffbea)",
        color: "var(--rvo-color-oranje-800, #7a3b00)",
        fontSize: "0.9375rem",
      }}
    >
      <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>Gearchiveerd</span>
      <span style={{ color: "var(--rvo-color-oranje-700, #b35900)" }}>·</span>
      <span>
        {entityLabel ? `${entityLabel} is gearchiveerd` : "Dit item is gearchiveerd"} op{" "}
        <strong>{formatDate(deletedAt)}</strong>. De pagina is alleen-lezen.
      </span>
    </div>
  );
}
