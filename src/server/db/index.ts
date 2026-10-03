import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { env } from "@/server/env";

function connect() {
  // One small pool per server process; Supabase's pooler sits on the other end.
  // `prepare: false` is required by pgbouncer in transaction mode and harmless in session mode.
  const client = postgres(env.DATABASE_URL, { max: 5, prepare: false, idle_timeout: 20 });
  return drizzle(client, { schema, casing: "snake_case" });
}

type Db = ReturnType<typeof connect>;

const globalForDb = globalThis as unknown as { db?: Db };

/**
 * Connects on first use, not on import. `next build` loads every route module
 * to collect page data; connecting there would make builds need DATABASE_URL
 * (and fail on preview deploys without it). Reused across dev hot reloads.
 */
export const db = new Proxy({} as Db, {
  get(_, prop) {
    globalForDb.db ??= connect();
    const value = Reflect.get(globalForDb.db, prop, globalForDb.db);
    return typeof value === "function" ? value.bind(globalForDb.db) : value;
  },
});
