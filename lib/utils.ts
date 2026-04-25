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

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("nl-NL");
}
