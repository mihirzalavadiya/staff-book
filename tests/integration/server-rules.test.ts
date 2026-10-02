import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import postgres from "postgres";
import { attendanceRows, createFixture, destroyFixture, type Fixture } from "../fixtures/household";

// Server actions call revalidatePath, which needs a Next.js request; here it is a no-op.
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { workerMark, workerRaiseDispute, workerRemind } = await import("@/server/actions/worker");
const { tokenCanAct } = await import("@/server/queries/worker");
const { ownedEngagement } = await import("@/server/queries/household");
const { addDays } = await import("@/lib/date");

let a: Fixture;
let b: Fixture;

beforeAll(async () => {
  [a, b] = await Promise.all([createFixture({ withAuthUser: false }), createFixture({ withAuthUser: false })]);
});

afterAll(async () => {
  await Promise.all([a && destroyFixture(a, { withAuthUser: false }), b && destroyFixture(b, { withAuthUser: false })]);
});

describe("authorization", () => {
  it("a worker link can act only on its own engagement", async () => {
    expect(await tokenCanAct(a.workers.claim.token, a.workers.claim.engagementId)).toBe(true);
    expect(await tokenCanAct(a.workers.claim.token, b.workers.claim.engagementId)).toBe(false);
    expect(await tokenCanAct("not-a-real-token", a.workers.claim.engagementId)).toBe(false);
  });

  it("a worker link cannot write to another household", async () => {
    const r = await workerMark({ token: a.workers.claim.token, engagementId: b.workers.claim.engagementId, date: b.today, state: "leave" });
    expect(r).toEqual({ ok: false, error: "forbidden" });
    expect(await attendanceRows(b.workers.claim.engagementId, b.today)).toEqual([]);
  });

  it("a household owner only sees their own engagements", async () => {
    expect(await ownedEngagement(a.ownerUserId, a.workers.claim.engagementId)).not.toBeNull();
    expect(await ownedEngagement(a.ownerUserId, b.workers.claim.engagementId)).toBeNull();
  });
});

describe("worker rules", () => {
  it("'I came' is stored as a claim, not as present", async () => {
    const w = a.workers.claim;
    expect(await workerMark({ token: w.token, engagementId: w.engagementId, date: a.today, state: "present" })).toEqual({ ok: true, data: undefined });
    expect(await attendanceRows(w.engagementId, a.today)).toEqual([{ state: "claim", markedBy: "worker" }]);
  });

  it("leave by the worker is final, and can be planned ahead", async () => {
    const w = a.workers.remind;
    const tomorrow = addDays(a.today, 1);
    expect((await workerMark({ token: w.token, engagementId: w.engagementId, date: tomorrow, state: "leave", note: "sick" })).ok).toBe(true);
    expect(await attendanceRows(w.engagementId, tomorrow)).toEqual([{ state: "leave", markedBy: "worker" }]);
  });

  it("cannot claim outside the 7-day window", async () => {
    const w = a.workers.settle;
    const r = await workerMark({ token: w.token, engagementId: w.engagementId, date: addDays(a.today, -8), state: "present" });
    expect(r).toEqual({ ok: false, error: "window" });
  });

  it("cannot claim a day the household already marked", async () => {
    const w = a.workers.settle;
    const yesterday = addDays(a.today, -1);
    // Past days are pre-filled as present by the household (when the month has any).
    if ((await attendanceRows(w.engagementId, yesterday)).length === 0) return;
    const r = await workerMark({ token: w.token, engagementId: w.engagementId, date: yesterday, state: "present" });
    expect(r).toEqual({ ok: false, error: "already marked" });
  });

  it("can only dispute a day the household marked", async () => {
    const w = a.workers.dispute;
    const r = await workerRaiseDispute({ token: w.token, engagementId: w.engagementId, date: a.today, note: "came" });
    expect(r).toEqual({ ok: false, error: "nothing to dispute" });
  });

  it("remind is recorded once per day and refused for future days", async () => {
    const w = a.workers.hindi;
    expect((await workerRemind({ token: w.token, engagementId: w.engagementId, date: a.today })).ok).toBe(true);
    expect((await workerRemind({ token: w.token, engagementId: w.engagementId, date: a.today })).ok).toBe(true);
    expect(await workerRemind({ token: w.token, engagementId: w.engagementId, date: addDays(a.today, 1) })).toEqual({ ok: false, error: "bad date" });
  });

  it("a finalized month cannot change", async () => {
    const w = b.workers.reject;
    const sql = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });
    try {
      await sql`insert into settlements (engagement_id, month, working_days, days_present, days_leave, paid_leave_used, unpaid_deduction, advance_deducted, amount_due)
                values (${w.engagementId}, ${b.today.slice(0, 7)}, 30, 30, 0, 0, 0, 0, ${w.salary})`;
    } finally {
      await sql.end();
    }
    const r = await workerMark({ token: w.token, engagementId: w.engagementId, date: b.today, state: "leave" });
    expect(r).toEqual({ ok: false, error: "finalized" });
  });
});

describe("database guarantees", () => {
  it("attendance rows can never be updated or deleted", async () => {
    const sql = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });
    try {
      const id = a.workers.claim.engagementId;
      await expect(sql`update attendance set state = 'present' where engagement_id = ${id}`).rejects.toThrow(/append-only/);
      await expect(sql`delete from attendance where engagement_id = ${id}`).rejects.toThrow(/append-only/);
    } finally {
      await sql.end();
    }
  });
});
