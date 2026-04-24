import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

declare global {
  // eslint-disable-next-line no-var
  var _pgClient: ReturnType<typeof postgres> | undefined;
}

// HMR-safe singleton
const client = global._pgClient ?? postgres(connectionString);
if (process.env.NODE_ENV !== "production") global._pgClient = client;

// Pass full schema so Drizzle query builder resolves relations
export const db = drizzle(client, { schema });
export type DB = typeof db;
