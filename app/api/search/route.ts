import type { MultiSearchResult } from "meilisearch";
import { requireAuth, withErrorHandling, ok } from "@/lib/api";
import { getClient, INDEXES, ensureIndexes } from "@/lib/search/client";

type Hit = Record<string, unknown>;

const INDEX_LABELS: Record<string, string> = {
  [INDEXES.employees]: "Medewerkers",
  [INDEXES.teams]: "Teams",
  [INDEXES.organisations]: "Organisaties",
  [INDEXES.financialSources]: "Financiering",
  [INDEXES.positions]: "Posities",
};

const INDEX_ORDER = [
  INDEXES.employees,
  INDEXES.teams,
  INDEXES.organisations,
  INDEXES.financialSources,
  INDEXES.positions,
];

function getTitle(indexUid: string, hit: Hit): string {
  switch (indexUid) {
    case INDEXES.employees: return (hit.fullName as string) ?? "";
    case INDEXES.teams: return (hit.name as string) ?? "";
    case INDEXES.organisations: return (hit.name as string) ?? "";
    case INDEXES.financialSources: return (hit.name as string) ?? "";
    case INDEXES.positions:
      return `${hit.type}${hit.positionCode ? ` (${hit.positionCode})` : ""}`;
    default: return "";
  }
}

function getSubtitle(indexUid: string, hit: Hit): string {
  switch (indexUid) {
    case INDEXES.employees: return (hit.organisationName as string) ?? "";
    case INDEXES.teams: return (hit.organisationName as string) ?? "";
    case INDEXES.organisations: return (hit.type as string) ?? "";
    case INDEXES.financialSources: return (hit.projectId as string) ?? "";
    case INDEXES.positions: return `${hit.teamName} · ${hit.status}`;
    default: return "";
  }
}

export const GET = withErrorHandling(async (req: Request) => {
  await requireAuth();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (!q) return ok({ results: [], query: "" });

  try {
    await ensureIndexes();
    const { results } = await getClient().multiSearch({
      queries: INDEX_ORDER.map((indexUid) => ({ indexUid, q, limit: 5 })),
    });

    const flat = results.flatMap((indexResult: MultiSearchResult<Hit>) => {
      const indexUid = indexResult.indexUid;
      return (indexResult.hits as Hit[]).map((hit) => ({
        type: indexUid,
        typeLabel: INDEX_LABELS[indexUid] ?? indexUid,
        id: hit.id as string,
        title: getTitle(indexUid, hit),
        subtitle: getSubtitle(indexUid, hit),
        url: hit.url as string,
      }));
    });

    return ok({ results: flat, query: q });
  } catch (err) {
    console.error("[search] Query failed:", err);
    return ok({ results: [], query: q, degraded: true });
  }
});
