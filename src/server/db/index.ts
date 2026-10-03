import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { env } from "@/server/env";

function connect() {
  // On Vercel, DATABASE_URL must be Supabase's transaction pooler (port 6543), which is
  // built for many short-lived clients. Each function instance keeps a small pool: one
  // instance serves several requests at once, and a page runs a few queries in parallel.
  // `prepare: false` is required by the transaction pooler.
  const serverless = Boolean(process.env.VERCEL);
  const client = postgres(env.DATABASE_URL, {
    max: serverless ? 3 : 5,
    prepare: false,
    idle_timeout: serverless ? 5 : 20,
    connect_timeout: 10,
  });
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
