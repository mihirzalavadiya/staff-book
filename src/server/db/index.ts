import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { env } from "@/server/env";

/**
 * One connection pool per server process. Supabase's session pooler is on the
 * other end, so keep the local pool small; `prepare: false` is required by
 * pgbouncer in transaction mode and harmless in session mode.
 */
const globalForDb = globalThis as unknown as { pgClient?: ReturnType<typeof postgres> };

const client =
  globalForDb.pgClient ??
  postgres(env.DATABASE_URL, {
    max: 5,
    prepare: false,
    idle_timeout: 20,
  });

if (process.env.NODE_ENV !== "production") globalForDb.pgClient = client;

export const db = drizzle(client, { schema, casing: "snake_case" });
