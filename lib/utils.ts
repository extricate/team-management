type EmployeeName = { firstName: string; lastName: string; prefixName?: string | null };

export function formatFullName({ firstName, prefixName, lastName }: EmployeeName): string {
  return prefixName
    ? `${firstName} ${prefixName} ${lastName}`
    : `${firstName} ${lastName}`;
}

export function formatCurrency(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(
    Number(value)
  );
}

export function formatCompactCurrency(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const num = Number(value);
  if (isNaN(num)) return "—";
  const abs = Math.abs(num);
  if (abs >= 1_000_000) {
    const mln = num / 1_000_000;
    const decimals = abs >= 10_000_000 ? 1 : 2;
    return `€ ${mln.toLocaleString("nl-NL", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}M`;
  }
  if (abs >= 100_000) {
    return `€ ${Math.round(num / 1_000).toLocaleString("nl-NL")}k`;
  }
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(num);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("nl-NL");
}
