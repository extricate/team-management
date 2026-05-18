export const NIET_BESCHIKBAAR_TITEL = "Niet beschikbaar";

export function isSentinel(f: { titel: string } | null | undefined): boolean {
  return f?.titel === NIET_BESCHIKBAAR_TITEL;
}

export function assertNotSentinel(f: { titel: string }): void {
  if (isSentinel(f)) {
    throw Object.assign(new Error('De functie "Niet beschikbaar" kan niet worden gewijzigd.'), { status: 403 });
  }
}

export function getPositionTitel(position: {
  type?: string | null;
  roltitel?: string | null;
  functie?: { titel: string } | null;
}): string {
  if (position.roltitel) return position.roltitel;
  if (position.functie?.titel) return position.functie.titel;
  return position.type ?? "—";
}
