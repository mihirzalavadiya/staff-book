import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import postgres from "postgres";
import { createFixture, destroyFixture, type Fixture } from "../fixtures/household";

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/server", async (importOriginal) => ({ ...(await importOriginal<object>()), after: () => {} }));
// The signed-in owner, switched per test.
const auth = vi.hoisted(() => ({ userId: "" }));
vi.mock("@/server/auth/supabase", () => ({ getAuthUser: async () => (auth.userId ? { id: auth.userId } : null) }));

const { resetWorkerLink } = await import("@/server/actions/household");
const { loadWorkerState, tokenCanAct } = await import("@/server/queries/worker");

let a: Fixture;
let b: Fixture;

const sql = () => postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });

beforeAll(async () => {
  [a, b] = await Promise.all([createFixture({ withAuthUser: false }), createFixture({ withAuthUser: false })]);
});
afterAll(async () => {
  await Promise.all([a && destroyFixture(a, { withAuthUser: false }), b && destroyFixture(b, { withAuthUser: false })]);
});

describe("resetting a worker's link", () => {
  it("another household cannot reset it", async () => {
    auth.userId = b.ownerUserId;
    expect(await resetWorkerLink({ engagementId: a.workers.claim.engagementId })).toEqual({ ok: false, error: "forbidden" });
    expect(await loadWorkerState(a.workers.claim.token)).not.toBeNull();
  });

  it("the old link stops working, the new one works, and old notification devices are dropped", async () => {
    const w = a.workers.claim;
    const db = sql();
    try {
      await db`insert into push_subscriptions (engagement_id, endpoint, p256dh, auth) values (${w.engagementId}, ${`https://push.test/${w.engagementId}`}, 'k', 'a')`;
    } finally {
      await db.end();
    }

    auth.userId = a.ownerUserId;
    const r = await resetWorkerLink({ engagementId: w.engagementId });
    expect(r.ok).toBe(true);
    const token = r.ok ? r.data.token : "";
    expect(token).not.toBe(w.token);

    expect(await loadWorkerState(w.token)).toBeNull();
    expect(await tokenCanAct(w.token, w.engagementId)).toBe(false);
    expect((await loadWorkerState(token))?.me.name).toBe(w.name);
    expect(await tokenCanAct(token, w.engagementId)).toBe(true);

    const check = sql();
    try {
      const [{ n }] = await check`select count(*)::int as n from push_subscriptions where engagement_id = ${w.engagementId}`;
      expect(n).toBe(0);
    } finally {
      await check.end();
    }
  });

  it("signed-out callers are refused", async () => {
    auth.userId = "";
    expect(await resetWorkerLink({ engagementId: a.workers.claim.engagementId })).toEqual({ ok: false, error: "unauthenticated" });
  });
});
