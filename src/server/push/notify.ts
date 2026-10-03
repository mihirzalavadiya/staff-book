import "server-only";

import { after } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { engagements, households, pushSubscriptions, workers } from "../db/schema";
import { sendPush } from "./send";
import { homeLabel } from "@/lib/home";
import type { PushEvent } from "@/lib/push-messages";

/** Who the notification is about, loaded once per send. */
async function context(engagementId: string) {
  const [row] = await db
    .select({ e: engagements, w: workers, h: households })
    .from(engagements)
    .innerJoin(workers, eq(engagements.workerId, workers.id))
    .innerJoin(households, eq(engagements.householdId, households.id))
    .where(eq(engagements.id, engagementId))
    .limit(1);
  return row ?? null;
}

type HouseholdEvent = (worker: { name: string; gender: "female" | "male" }) => PushEvent;
type WorkerEvent = (ctx: { token: string; house: string }) => PushEvent;

/** Runs after the response is sent, so the tapped button never waits on push delivery. */
function later(task: () => Promise<unknown>) {
  after(() => task().catch((err) => console.error("[push]", (err as Error).message)));
}

/** Tells every device of the household that owns this engagement. */
export function notifyHousehold(engagementId: string, build: HouseholdEvent) {
  later(async () => {
    const ctx = await context(engagementId);
    if (!ctx) return;
    const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.householdId, ctx.h.id));
    await sendPush(subs, build({ name: ctx.w.name, gender: ctx.w.gender }));
  });
}

/** Tells every device the worker subscribed from, across all their houses. */
export function notifyWorker(engagementId: string, build: WorkerEvent) {
  later(async () => {
    const ctx = await context(engagementId);
    if (!ctx) return;
    const theirs = await db
      .select({ id: engagements.id })
      .from(engagements)
      .where(and(eq(engagements.workerId, ctx.w.id), eq(engagements.status, "active")));
    const subs = await db
      .select()
      .from(pushSubscriptions)
      .where(inArray(pushSubscriptions.engagementId, theirs.map((r) => r.id)));
    await sendPush(subs, build({ token: ctx.e.workerToken, house: homeLabel(ctx.h.name, ctx.h.flat) }));
  });
}
