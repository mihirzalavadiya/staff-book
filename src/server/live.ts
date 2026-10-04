import "server-only";

import { after } from "next/server";
import { and, eq, inArray, or } from "drizzle-orm";
import { db } from "./db";
import { engagements } from "./db/schema";
import { env } from "./env";
import { householdTopic, LIVE_EVENT, workerTopic } from "@/lib/live";
import { publicEnv } from "@/lib/env";

/** Who should hear about a change. Engagements are resolved to both their home and their worker. */
export type LiveTarget =
  | { engagementIds: string[] }
  | { householdId: string; withWorkers?: boolean }
  | { workerId: string };

async function topicsFor(targets: LiveTarget[]): Promise<string[]> {
  const topics = new Set<string>();
  const engagementIds: string[] = [];
  const householdsWithWorkers: string[] = [];
  for (const t of targets) {
    if ("engagementIds" in t) engagementIds.push(...t.engagementIds);
    else if ("householdId" in t) {
      topics.add(householdTopic(t.householdId));
      if (t.withWorkers) householdsWithWorkers.push(t.householdId);
    } else topics.add(workerTopic(t.workerId));
  }
  if (engagementIds.length || householdsWithWorkers.length) {
    const rows = await db
      .select({ householdId: engagements.householdId, workerId: engagements.workerId, linkTo: engagements.linkToWorkerId })
      .from(engagements)
      .where(
        or(
          engagementIds.length ? inArray(engagements.id, engagementIds) : undefined,
          householdsWithWorkers.length
            ? and(inArray(engagements.householdId, householdsWithWorkers), eq(engagements.status, "active"))
            : undefined,
        ),
      );
    for (const r of rows) {
      topics.add(householdTopic(r.householdId));
      topics.add(workerTopic(r.workerId));
      // A pending invite shows on the invited person's existing link too.
      if (r.linkTo) topics.add(workerTopic(r.linkTo));
    }
  }
  return [...topics];
}

async function broadcast(topics: string[]) {
  if (topics.length === 0) return;
  const res = await fetch(`${publicEnv.SUPABASE_URL}/realtime/v1/api/broadcast`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ messages: topics.map((topic) => ({ topic, event: LIVE_EVENT, payload: {} })) }),
  });
  if (!res.ok) throw new Error(`broadcast ${res.status}`);
}

/**
 * Tells every open screen that can see these records to reload. Runs after the
 * response is sent, so saving never waits on it, and a failure only means the
 * other side updates on its next refresh instead of instantly.
 */
export function announce(...targets: LiveTarget[]): void {
  if (process.env.VITEST) return;
  after(() =>
    topicsFor(targets)
      .then(broadcast)
      .catch((err) => console.error("[live]", (err as Error).message)),
  );
}
