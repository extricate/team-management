import type { FinancialTypeCategory } from "@/lib/db/schema";

export type OPFNaturalCategory = FinancialTypeCategory | "extern";

export interface OPFTypeDef {
  key: string;
  label: string;
  naturalCategory: OPFNaturalCategory;
  isExternal: boolean;
  hint: string;
}

export const OPF_TYPES: OPFTypeDef[] = [
  {
    key: "OPF1",
    label: "OPF1 – Regulier formatiebudget",
    naturalCategory: "PERSEX",
    isExternal: false,
    hint: "Structurele interne formatieplaats. Gefinancierd uit personeelsbudget (PERSEX).",
  },
  {
    key: "OPF2b-vap",
    label: "OPF2b – Verzamelarbeidsplaats",
    naturalCategory: "PERSEX",
    isExternal: false,
    hint: "Flexibele of tijdelijke arbeidsplaats voor eigen medewerkers. Gefinancierd uit personeelsbudget (PERSEX).",
  },
  {
    key: "OPF2b-nw",
    label: "OPF2b – Niet-werknemer (inhuurbudget)",
    naturalCategory: "MATEX",
    isExternal: true,
    hint: "Inhuur van een externe niet-werknemer (ZZP of detachering). Gefinancierd uit inhuurbudget (MATEX).",
  },
  {
    key: "OPF3",
    label: "OPF3 a+b – Externe financiering",
    naturalCategory: "extern",
    isExternal: false,
    hint: "Positie gefinancierd vanuit een externe bron (bijv. subsidie of opdracht). Budgettype afhankelijk van de financieringsafspraak.",
  },
  {
    key: "OPF4",
    label: "OPF4 b+c – Herplaatsers",
    naturalCategory: "PERSEX",
    isExternal: false,
    hint: "Medewerker in herplaatsingstraject. Gefinancierd uit personeelsbudget (PERSEX).",
  },
  {
    key: "OPF5",
    label: "OPF5 – Reservisten",
    naturalCategory: "PERSEX",
    isExternal: false,
    hint: "Reservistenpositie. Gefinancierd uit personeelsbudget (PERSEX).",
  },
  {
    key: "OPF8",
    label: "OPF8 – Investeringsbudget",
    naturalCategory: "Investeringen",
    isExternal: false,
    hint: "Positie gefinancierd uit investeringsbudget voor projecten of programma's.",
  },
  {
    key: "OPF9-inhuur",
    label: "OPF9 – Inhuurbudget (externe inhuur)",
    naturalCategory: "Investeringen",
    isExternal: true,
    hint: "Externe inhuur voor projecten of investeringsprogramma's. Gefinancierd uit investeringsbudget (Investeringen). Externe medewerkers zijn doorgaans duurder per FTE dan intern personeel.",
  },
  {
    key: "OPF9-wba",
    label: "OPF9 – Arbeidsparticipanten WBA",
    naturalCategory: "PERSEX",
    isExternal: false,
    hint: "Arbeidsparticipanten in het kader van de Wet Banenafspraak (WBA). Gefinancierd uit personeelsbudget (PERSEX).",
  },
  {
    key: "OPF9-stagiair",
    label: "OPF9 – Stagiaires",
    naturalCategory: "PERSEX",
    isExternal: false,
    hint: "Stageplekken. Gefinancierd uit personeelsbudget (PERSEX).",
  },
];

export function getOPFType(key: string | null | undefined): OPFTypeDef | undefined {
  if (!key) return undefined;
  return OPF_TYPES.find((t) => t.key === key);
}

export const CATEGORY_LABELS: Record<OPFNaturalCategory, string> = {
  PERSEX: "PERSEX",
  MATEX: "MATEX",
  Investeringen: "Investeringen",
  extern: "Extern",
};

export const CATEGORY_COLORS: Record<OPFNaturalCategory, { bg: string; text: string }> = {
  PERSEX: { bg: "var(--rvo-color-hemelblauw-100, #d3e4f5)", text: "var(--rvo-color-hemelblauw-800)" },
  MATEX: { bg: "var(--rvo-color-groen-100, #c7e9c0)", text: "var(--rvo-color-groen-800, #005a00)" },
  Investeringen: { bg: "var(--rvo-color-geel-100, #fff9e6)", text: "var(--rvo-color-oranje-800, #7a3b00)" },
  extern: { bg: "var(--rvo-color-grijs-100, #f0f0f0)", text: "var(--rvo-color-grijs-700)" },
};
