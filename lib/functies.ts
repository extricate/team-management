export const NIET_BESCHIKBAAR_TITEL = "Niet beschikbaar";

/**
 * Returns the display title for a position, handling all three data models:
 * - roltitel: custom title for "Niet beschikbaar" positions
 * - functie.titel: title from the linked functie (new model)
 * - type: legacy free-text field
 */
export function getPositionTitel(position: {
  type?: string | null;
  roltitel?: string | null;
  functie?: { titel: string } | null;
}): string {
  if (position.roltitel) return position.roltitel;
  if (position.functie?.titel) return position.functie.titel;
  return position.type ?? "—";
}
