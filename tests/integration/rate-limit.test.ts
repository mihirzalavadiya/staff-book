import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import postgres from "postgres";

const { hit, isBlocked, sweepRateLimits } = await import("@/server/rate-limit");

const key = `test:${randomUUID()}`;
const limit = { max: 2, windowSec: 60 };
const sql = () => postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });

async function exec<T>(fn: (db: ReturnType<typeof sql>) => Promise<T>): Promise<T> {
  const db = sql();
  try {
    return await fn(db);
  } finally {
    await db.end();
  }
}

afterAll(() => exec((db) => db`delete from rate_limits where key = ${key}`));

describe("rate limits", () => {
  it("allows up to the limit, then refuses", async () => {
    expect(await hit(key, limit)).toBe(true);
    expect(await isBlocked(key, limit)).toBe(false);
    expect(await hit(key, limit)).toBe(true);
    expect(await isBlocked(key, limit)).toBe(true);
    expect(await hit(key, limit)).toBe(false);
  });

  it("starts counting again once the window has passed", async () => {
    await exec((db) => db`update rate_limits set window_start = now() - interval '2 minutes' where key = ${key}`);
    expect(await isBlocked(key, limit)).toBe(false);
    expect(await hit(key, limit)).toBe(true);
    const [{ count }] = await exec((db) => db`select count from rate_limits where key = ${key}`);
    expect(count).toBe(1);
  });

  it("the daily sweep drops counters older than a day", async () => {
    await exec((db) => db`update rate_limits set window_start = now() - interval '2 days' where key = ${key}`);
    await sweepRateLimits();
    const rows = await exec((db) => db`select 1 from rate_limits where key = ${key}`);
    expect(rows.length).toBe(0);
  });
});
