type BadgeColor = "green" | "orange" | "blue" | "grey" | "red";

const colorMap: Record<BadgeColor, { bg: string; color: string }> = {
  green:  { bg: "var(--rvo-color-groen-100, #d4edda)",  color: "var(--rvo-color-groen-700, #155724)" },
  orange: { bg: "var(--rvo-color-geel-100, #fff3cd)",   color: "var(--rvo-color-oranje-700, #8a4b00)" },
  blue:   { bg: "var(--rvo-color-hemelblauw-100, #d3e4f5)", color: "var(--rvo-color-hemelblauw-800, #003d83)" },
  grey:   { bg: "var(--rvo-color-grijs-100, #f1f1f1)",  color: "var(--rvo-color-grijs-700, #4a4a4a)" },
  red:    { bg: "var(--rvo-color-rood-100, #fdecea)",   color: "var(--rvo-color-rood-700, #7d1a0f)" },
};

export function StatusBadge({ label, color }: { label: string; color: BadgeColor }) {
  const { bg, color: textColor } = colorMap[color] ?? colorMap.grey;
  return (
    <span style={{
      display: "inline-block",
      background: bg,
      color: textColor,
      borderRadius: "20px",
      padding: "0.1875rem 0.625rem",
      fontSize: "0.8125rem",
      fontWeight: 600,
      whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
}
