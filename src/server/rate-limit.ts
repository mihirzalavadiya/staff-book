import "server-only";

import { headers } from "next/headers";
import { lt, sql } from "drizzle-orm";
import { db } from "./db";
import { rateLimits } from "./db/schema";

/**
 * Rate limits, counted in Postgres so every serverless instance shares them.
 * Fixed windows: a key may be hit `max` times per `windowSec`, then it is
 * refused until the window rolls over. Limits sit well above normal use; they
 * exist to stop scripts, password guessing and code-spamming someone's inbox.
 */
export interface Limit {
  max: number;
  windowSec: number;
}

export const LIMITS = {
  /** Login codes asked for one email address. */
  otpPerEmail: { max: 5, windowSec: 15 * 60 },
  /**
   * Login attempts (codes, passwords, code checks) from one network. Generous on
   * purpose: mobile carriers put many people behind one address. The per-email
   * limits are what actually stop guessing.
   */
  loginPerIp: { max: 100, windowSec: 15 * 60 },
  /** Wrong passwords or codes against one email address (right ones are not counted). */
  guessPerEmail: { max: 10, windowSec: 15 * 60 },
  /** Saves from one signed-in household. */
  household: { max: 60, windowSec: 60 },
  /** Saves from one worker link. */
  worker: { max: 30, windowSec: 60 },
  /** Unknown worker links opened from one network. */
  badLinkPerIp: { max: 20, windowSec: 10 * 60 },
} satisfies Record<string, Limit>;


/** Counts one hit and says whether it is still allowed. Fails open: a database hiccup never locks people out. */
export async function hit(key: string, limit: Limit): Promise<boolean> {
  try {
    const [row] = await db
      .insert(rateLimits)
      .values({ key, count: 1 })
      .onConflictDoUpdate({
        target: rateLimits.key,
        set: {
          count: sql`case when ${rateLimits.windowStart} < now() - make_interval(secs => ${limit.windowSec}) then 1 else ${rateLimits.count} + 1 end`,
          windowStart: sql`case when ${rateLimits.windowStart} < now() - make_interval(secs => ${limit.windowSec}) then now() else ${rateLimits.windowStart} end`,
        },
      })
      .returning({ count: rateLimits.count });
    return (row?.count ?? 0) <= limit.max;
  } catch (err) {
    console.error("[rate-limit]", (err as Error).message);
    return true;
  }
}

/** True when the key has already used up its window, without counting a hit. */
export async function isBlocked(key: string, limit: Limit): Promise<boolean> {
  try {
    const row = await db.query.rateLimits.findFirst({
      where: (r, { and, eq, gte }) => and(eq(r.key, key), gte(r.windowStart, sql`now() - make_interval(secs => ${limit.windowSec})`)),
    });
    return (row?.count ?? 0) >= limit.max;
  } catch {
    return false;
  }
}

const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1", "unknown"]);

/**
 * The caller's IP as Vercel reports it, or null on this machine (local dev and
 * tests), where every request shares one address and per-network limits would
 * only trip the test suite. On Vercel the header is always a real address.
 */
export async function clientIp(): Promise<string | null> {
  const h = await headers();
  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return LOOPBACK.has(ip) ? null : ip;
}

/** Drops counters whose window ended long ago. Called by the daily cron. */
export async function sweepRateLimits(): Promise<void> {
  await db.delete(rateLimits).where(lt(rateLimits.windowStart, sql`now() - interval '1 day'`));
}
