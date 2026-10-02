import { describe, expect, it } from "vitest";
import { reduce } from "@/lib/store";
import { dayInfo } from "@/lib/ledger";
import { TODAY, entry, state, worker } from "./helpers";

const w = worker();

describe("reduce – optimistic mirror of the server rules", () => {
  it("household marking present is final", () => {
    const s = reduce(state(), { type: "mark", workerId: "e1", date: TODAY, state: "present", by: "household" });
    expect(dayInfo(s, w, TODAY).state).toBe("present");
  });
  it("worker marking present is only a claim", () => {
    const s = reduce(state(), { type: "mark", workerId: "e1", date: TODAY, state: "present", by: "worker" });
    expect(dayInfo(s, w, TODAY).state).toBe("claim");
  });
  it("worker marking leave is final", () => {
    const s = reduce(state(), { type: "mark", workerId: "e1", date: TODAY, state: "leave", by: "worker" });
    expect(dayInfo(s, w, TODAY).state).toBe("leave");
  });
  it("confirming a claim makes it present; rejecting records leave and opens a dispute", () => {
    const claimed = state({ attendance: [entry(TODAY, "claim", "worker")] });
    expect(dayInfo(reduce(claimed, { type: "confirmClaim", workerId: "e1", date: TODAY }), w, TODAY).state).toBe("present");
    const rejected = reduce(claimed, { type: "rejectClaim", workerId: "e1", date: TODAY });
    const info = dayInfo(rejected, w, TODAY);
    expect(info.state).toBe("dispute");
    expect(info.history.map((h) => h.state)).toEqual(["claim", "leave", "dispute"]);
  });
  it("never deletes: every action appends", () => {
    let s = state();
    s = reduce(s, { type: "mark", workerId: "e1", date: TODAY, state: "leave", by: "household" });
    s = reduce(s, { type: "raiseDispute", workerId: "e1", date: TODAY, note: "came", voiceSeconds: 9 });
    s = reduce(s, { type: "resolveDispute", workerId: "e1", date: TODAY, resolution: "present" });
    expect(s.attendance).toHaveLength(3);
    expect(dayInfo(s, w, TODAY).state).toBe("present");
  });
  it("advances, finalize and markPaid", () => {
    let s = reduce(state(), { type: "addAdvance", workerId: "e1", amount: 500, date: TODAY });
    expect(s.advances[0].amount).toBe(500);
    s = reduce(s, { type: "finalize", workerId: "e1", month: "2025-09", amountDue: 2192 });
    expect(s.settlements[0]).toMatchObject({ month: "2025-09", amountDue: 2192 });
    expect(s.settlements[0].paidAt).toBeUndefined();
    s = reduce(s, { type: "markPaid", workerId: "e1", month: "2025-09" });
    expect(s.settlements[0].paidAt).toBeDefined();
  });
  it("remind replaces an earlier reminder for the same day", () => {
    let s = reduce(state(), { type: "remind", workerId: "e1", date: "2025-09-17" });
    s = reduce(s, { type: "remind", workerId: "e1", date: "2025-09-17" });
    expect(s.reminders).toHaveLength(1);
  });
  it("endWork archives without removing the worker", () => {
    const s = reduce(state(), { type: "endWork", workerId: "e1", endDate: TODAY });
    expect(s.workers).toHaveLength(1);
    expect(s.workers[0].endDate).toBe(TODAY);
  });
});
