import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { env } from "@/server/env";

function connect() {
  // On Vercel every function instance is its own process, so each must hold at most one
  // connection, or a burst of instances exhausts the database pooler. Locally, a few help.
  // `prepare: false` is required by Supabase's transaction pooler (port 6543).
  const serverless = Boolean(process.env.VERCEL);
  const client = postgres(env.DATABASE_URL, {
    max: serverless ? 1 : 5,
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
