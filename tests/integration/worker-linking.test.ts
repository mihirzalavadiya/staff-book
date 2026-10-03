import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import postgres from "postgres";
import { createFixture, destroyFixture, type Fixture } from "../fixtures/household";

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/server", async (importOriginal) => ({ ...(await importOriginal<object>()), after: () => {} }));

const { workerRespondInvite } = await import("@/server/actions/worker");
const { loadWorkerState } = await import("@/server/queries/worker");

let a: Fixture; // Sunita's first home
let b: Fixture; // a second home that adds her phone

const sql = () => postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });

/** Makes b's "claim" worker an invite to a's "claim" worker, as addWorker does on a phone match. */
async function invite(): Promise<{ personA: string; placeholder: string }> {
  const db = sql();
  try {
    const [{ worker_id: personA }] = await db`select worker_id from engagements where id = ${a.workers.claim.engagementId}`;
    const [{ worker_id: placeholder }] = await db`select worker_id from engagements where id = ${b.workers.claim.engagementId}`;
    await db`update engagements set link_to_worker_id = ${personA} where id = ${b.workers.claim.engagementId}`;
    return { personA, placeholder };
  } finally {
    await db.end();
  }
}

beforeAll(async () => {
  [a, b] = await Promise.all([createFixture({ withAuthUser: false }), createFixture({ withAuthUser: false })]);
});
afterAll(async () => {
  await Promise.all([a && destroyFixture(a, { withAuthUser: false }), b && destroyFixture(b, { withAuthUser: false })]);
});

describe("one worker, many homes", () => {
  it("an invited home shows on the worker's existing link, not as a house yet", async () => {
    await invite();
    const state = await loadWorkerState(a.workers.claim.token);
    expect(state?.invites.map((i) => i.id)).toEqual([b.workers.claim.engagementId]);
    expect(state?.houses.map((h) => h.id)).not.toContain(b.workers.claim.engagementId);
  });

  it("the new home's own link cannot accept (it could be anyone's number)", async () => {
    const r = await workerRespondInvite({ token: b.workers.claim.token, engagementId: b.workers.claim.engagementId, accept: true });
    expect(r).toEqual({ ok: false, error: "no invite" });
  });

  it("another worker's link cannot accept it either", async () => {
    const r = await workerRespondInvite({ token: a.workers.reject.token, engagementId: b.workers.claim.engagementId, accept: true });
    expect(r).toEqual({ ok: false, error: "no invite" });
  });

  it("accepting moves the home onto the worker's link and removes the duplicate person", async () => {
    const { personA, placeholder } = await invite();
    expect((await workerRespondInvite({ token: a.workers.claim.token, engagementId: b.workers.claim.engagementId, accept: true })).ok).toBe(true);

    const state = await loadWorkerState(a.workers.claim.token);
    expect(state?.houses.map((h) => h.id)).toEqual(expect.arrayContaining([a.workers.claim.engagementId, b.workers.claim.engagementId]));
    expect(state?.invites).toEqual([]);
    // b's own link now shows both homes too.
    expect((await loadWorkerState(b.workers.claim.token))?.me.id).toBe(personA);

    const db = sql();
    try {
      expect(await db`select 1 from workers where id = ${placeholder}`).toHaveLength(0);
    } finally {
      await db.end();
    }
  });

  it("declining keeps them as separate people", async () => {
    const db = sql();
    try {
      const [{ worker_id: personA }] = await db`select worker_id from engagements where id = ${a.workers.dispute.engagementId}`;
      await db`update engagements set link_to_worker_id = ${personA} where id = ${b.workers.dispute.engagementId}`;
    } finally {
      await db.end();
    }
    expect((await workerRespondInvite({ token: a.workers.dispute.token, engagementId: b.workers.dispute.engagementId, accept: false })).ok).toBe(true);
    const state = await loadWorkerState(a.workers.dispute.token);
    expect(state?.invites).toEqual([]);
    expect(state?.houses.map((h) => h.id)).toEqual([a.workers.dispute.engagementId]);
  });
});
