import "server-only";

import { createHmac } from "node:crypto";
import { after } from "next/server";
import { and, eq, inArray, or } from "drizzle-orm";
import { db } from "./db";
import { engagements } from "./db/schema";
import { env } from "./env";
import { LIVE_EVENT } from "@/lib/live";
import { publicEnv } from "@/lib/env";

/**
 * Channel names are keyed hashes, never raw ids, so nobody can work one out
 * from data they have seen. A worker's channel hangs off their link, so making
 * a new link also cuts the old link off from its channel.
 */
function topic(kind: "household" | "link", value: string): string {
  const mac = createHmac("sha256", env.SUPABASE_SERVICE_ROLE_KEY).update(`staffbook-live:${kind}:${value}`).digest("base64url");
  return `sb-${kind}-${mac.slice(0, 32)}`;
}

export const householdTopic = (householdId: string) => topic("household", householdId);
export const linkTopic = (workerToken: string) => topic("link", workerToken);

/** Channels a worker's screen listens on: one per active home of that person, whichever link they opened. */
export async function workerTopics(workerId: string): Promise<string[]> {
  const rows = await db
    .select({ token: engagements.workerToken })
    .from(engagements)
    .where(and(eq(engagements.workerId, workerId), eq(engagements.status, "active")));
  return rows.map((r) => linkTopic(r.token));
}

/** Who should hear about a change. Engagements are resolved to both their home and their worker. */
export type LiveTarget =
  | { engagementIds: string[] }
  | { householdId: string; withWorkers?: boolean }
  | { workerId: string }
  /** A link that just stopped working, so its open screens reload into a 404. */
  | { oldToken: string };

async function topicsFor(targets: LiveTarget[]): Promise<string[]> {
  const topics = new Set<string>();
  const engagementIds: string[] = [];
  const householdsWithWorkers: string[] = [];
  const people = new Set<string>();
  for (const t of targets) {
    if ("engagementIds" in t) engagementIds.push(...t.engagementIds);
    else if ("householdId" in t) {
      topics.add(householdTopic(t.householdId));
      if (t.withWorkers) householdsWithWorkers.push(t.householdId);
    } else if ("workerId" in t) people.add(t.workerId);
    else topics.add(linkTopic(t.oldToken));
  }
  if (engagementIds.length || householdsWithWorkers.length) {
    const rows = await db
      .select({ householdId: engagements.householdId, token: engagements.workerToken, linkTo: engagements.linkToWorkerId })
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
      topics.add(linkTopic(r.token));
      // A pending invite shows on the invited person's existing links too.
      if (r.linkTo) people.add(r.linkTo);
    }
  }
  for (const id of people) for (const t of await workerTopics(id)) topics.add(t);
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
