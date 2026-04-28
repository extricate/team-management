import { formatCurrency, formatCompactCurrency } from "@/lib/utils";

interface Props {
  value: string | number | null | undefined;
  compact?: boolean;
}

export function CurrencyDisplay({ value, compact = true }: Props) {
  if (!compact) return <span>{formatCurrency(value)}</span>;
  const full = formatCurrency(value);
  const short = formatCompactCurrency(value);
  if (full === short) return <span>{full}</span>;
  return (
    <abbr title={full} style={{ textDecoration: "none", cursor: "help", borderBottom: "1px dotted var(--rvo-color-grijs-500)" }}>
      {short}
    </abbr>
  );
}
