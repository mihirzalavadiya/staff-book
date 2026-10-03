import "server-only";

import webpush from "web-push";
import { inArray } from "drizzle-orm";
import { db } from "../db";
import { pushSubscriptions } from "../db/schema";
import { env } from "../env";
import { publicEnv } from "@/lib/env";
import { buildPush, type PushEvent } from "@/lib/push-messages";

let configured = false;

/** False when VAPID keys are missing (e.g. a fresh clone): pushes are skipped, nothing breaks. */
function configure(): boolean {
  if (configured) return true;
  if (!publicEnv.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return false;
  webpush.setVapidDetails(env.VAPID_SUBJECT, publicEnv.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  configured = true;
  return true;
}

type Subscription = typeof pushSubscriptions.$inferSelect;

/**
 * Sends `event` to each subscription in its own language. Subscriptions the
 * push service reports as gone (404/410) are deleted. Returns how many sent.
 */
export async function sendPush(subs: Subscription[], event: PushEvent): Promise<number> {
  if (subs.length === 0 || !configure()) return 0;
  const gone: string[] = [];
  let sent = 0;
  await Promise.all(
    subs
      .filter((s) => s.enabled)
      .map(async (s) => {
        const message = buildPush(event, s.language);
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify(message),
            { TTL: 60 * 60 * 12, urgency: "normal", topic: message.tag.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32) },
          );
          sent += 1;
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) gone.push(s.id);
          else console.error("[push] send failed", status ?? (err as Error).message);
        }
      }),
  );
  if (gone.length) await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.id, gone));
  return sent;
}
