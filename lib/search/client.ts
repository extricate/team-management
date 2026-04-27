import { Meilisearch } from "meilisearch";

export const INDEXES = {
  employees: "employees",
  teams: "teams",
  organisations: "organisations",
  financialSources: "financial-sources",
  positions: "positions",
} as const;

export type IndexName = (typeof INDEXES)[keyof typeof INDEXES];

let _client: Meilisearch | null = null;
let _setupPromise: Promise<void> | null = null;

export function getClient(): Meilisearch {
  if (!_client) {
    _client = new Meilisearch({
      host: process.env.MEILISEARCH_HOST ?? "http://localhost:7700",
      apiKey: process.env.MEILISEARCH_KEY ?? "teambeheer_search_key",
    });
  }
  return _client;
}

async function configureIndexes(): Promise<void> {
  const c = getClient();
  // updateSettings enqueues a task in MeiliSearch (creates the index if absent).
  // We must wait for each task to complete before the indexes are queryable.
  const tasks = await Promise.all([
    c.index(INDEXES.employees).updateSettings({
      searchableAttributes: ["fullName", "firstName", "lastName", "prefixName", "organisationName"],
      displayedAttributes: ["id", "fullName", "firstName", "lastName", "prefixName", "organisationName", "organisationId", "url"],
      filterableAttributes: ["organisationId"],
    }),
    c.index(INDEXES.teams).updateSettings({
      searchableAttributes: ["name", "description", "organisationName"],
      displayedAttributes: ["id", "name", "description", "organisationName", "organisationId", "url"],
      filterableAttributes: ["organisationId"],
    }),
    c.index(INDEXES.organisations).updateSettings({
      searchableAttributes: ["name", "type"],
      displayedAttributes: ["id", "name", "type", "url"],
    }),
    c.index(INDEXES.financialSources).updateSettings({
      searchableAttributes: ["name", "projectId", "organisationName"],
      displayedAttributes: ["id", "name", "projectId", "organisationName", "organisationId", "url"],
      filterableAttributes: ["organisationId"],
    }),
    c.index(INDEXES.positions).updateSettings({
      searchableAttributes: ["type", "positionCode", "schaal", "teamName", "organisationName"],
      displayedAttributes: ["id", "type", "positionCode", "schaal", "status", "teamName", "teamId", "organisationName", "url"],
      filterableAttributes: ["teamId", "status"],
    }),
  ]);
  await c.tasks.waitForTasks(tasks.map(task => task.taskUid));
}

// Lazily configure indexes once per process; retries on failure.
export function ensureIndexes(): Promise<void> {
  if (!_setupPromise) {
    _setupPromise = configureIndexes().catch((err) => {
      _setupPromise = null; // allow retry on next request
      throw err;            // propagate so the search route's try/catch handles it
    });
  }
  return _setupPromise;
}
