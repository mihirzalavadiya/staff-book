"use server";

import { eq } from "drizzle-orm";
import { db } from "../db";
import { households, pushSubscriptions } from "../db/schema";
import { getAuthUser } from "../auth/supabase";
import { engagementByToken } from "../queries/worker";
import { fail, ok, type ActionResult } from "./result";
import type { Lang } from "@/lib/types";

interface BrowserSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

function valid(sub: unknown): sub is BrowserSubscription {
  const s = sub as BrowserSubscription;
  return (
    typeof s?.endpoint === "string" &&
    s.endpoint.startsWith("https://") &&
    s.endpoint.length < 1000 &&
    typeof s.keys?.p256dh === "string" &&
    typeof s.keys?.auth === "string"
  );
}

const lang = (l: unknown): Lang => (l === "hi" ? "hi" : "en");

/** Saves this device for the signed-in household. One row per device (endpoint). */
export async function subscribeHousehold(input: { subscription: unknown; language: Lang }): Promise<ActionResult> {
  const user = await getAuthUser();
  if (!user) return fail("unauthenticated");
  if (!valid(input.subscription)) return fail("bad subscription");
  const household = await db.query.households.findFirst({ where: eq(households.ownerUserId, user.id) });
  if (!household) return fail("no household");
  const { endpoint, keys } = input.subscription;
  await db
    .insert(pushSubscriptions)
    .values({ householdId: household.id, endpoint, p256dh: keys.p256dh, auth: keys.auth, language: lang(input.language) })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { householdId: household.id, engagementId: null, p256dh: keys.p256dh, auth: keys.auth, language: lang(input.language), enabled: true },
    });
  return ok();
}

/** Saves this device for the worker whose link this is. */
export async function subscribeWorker(input: { token: string; subscription: unknown; language: Lang }): Promise<ActionResult> {
  const engagement = await engagementByToken(input.token);
  if (!engagement) return fail("forbidden");
  if (!valid(input.subscription)) return fail("bad subscription");
  const { endpoint, keys } = input.subscription;
  await db
    .insert(pushSubscriptions)
    .values({ engagementId: engagement.id, endpoint, p256dh: keys.p256dh, auth: keys.auth, language: lang(input.language) })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { engagementId: engagement.id, householdId: null, p256dh: keys.p256dh, auth: keys.auth, language: lang(input.language), enabled: true },
    });
  return ok();
}

/** Forgets this device. Knowing the endpoint is proof enough: it is a secret URL only this browser holds. */
export async function unsubscribe(input: { endpoint: string }): Promise<ActionResult> {
  if (typeof input.endpoint !== "string" || !input.endpoint.startsWith("https://")) return fail("bad endpoint");
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, input.endpoint));
  return ok();
}
