import { describe, expect, it } from "vitest";
import { buildPush, dailyEvents } from "@/lib/push-messages";
import { entry, state, worker, workdaysUntil } from "./helpers";

const raju = { name: "Raju", gender: "male" as const };
const sunita = { name: "Sunita", gender: "female" as const };

describe("buildPush – text in the device's language, with gender", () => {
  it("claim today vs on a past date", () => {
    expect(buildPush({ kind: "claim", worker: raju, engagementId: "e", date: "2025-09-27", today: "2025-09-27" }, "hi").body).toBe(
      "Raju बोल रहा है आज आया। पक्का करो।",
    );
    expect(buildPush({ kind: "claim", worker: sunita, engagementId: "e", date: "2025-09-24", today: "2025-09-27" }, "en").body).toBe(
      "Sunita says she came on 24 Sept. Tap to confirm.",
    );
  });
  it("opens the right screen and collapses repeats with a tag", () => {
    const m = buildPush({ kind: "dispute", worker: sunita, engagementId: "e1", date: "2025-09-25" }, "en");
    expect(m.url).toBe("/inbox");
    expect(m.tag).toBe("dispute-e1-2025-09-25");
  });
  it("leave with a reason is translated", () => {
    expect(buildPush({ kind: "leave", worker: sunita, engagementId: "e", date: "2025-09-29", reason: "sick" }, "hi").body).toBe(
      "Sunita 29 सितंबर को छुट्टी पर रहेंगे (तबीयत)।",
    );
  });
  it("worker-facing messages link back to their own screens", () => {
    const m = buildPush({ kind: "settled", token: "tok", house: "Priya's home", month: "2025-09", amount: 2192 }, "hi");
    expect(m).toMatchObject({ title: "Priya's home", body: "सितंबर का हिसाब: ₹2,192", url: "/w/tok/hisaab" });
  });
  it("never leaves braces behind", () => {
    const m = buildPush({ kind: "daily", unmarkedToday: [raju, sunita], olderPending: 1 }, "en");
    expect(m.body).toBe("2 not marked today: Raju, Sunita. 1 older day is still unmarked.");
    expect(m.body).not.toMatch(/[{}]/);
  });
});

describe("dailyEvents – only when there is something to act on", () => {
  const filled = (until: string) => workdaysUntil(until).map((d) => entry(d, "present", "household"));

  it("is silent when everything is filled", () => {
    expect(dailyEvents(state({ attendance: filled("2025-09-27") }))).toEqual([]);
  });
  it("asks about today's unmarked workers and counts older gaps", () => {
    const att = filled("2025-09-26").filter((a) => a.date !== "2025-09-17");
    const [ev] = dailyEvents(state({ attendance: att }));
    expect(ev).toEqual({ kind: "daily", unmarkedToday: [{ name: "Sunita", gender: "female" }], olderPending: 1 });
  });
  it("skips people who do not work today", () => {
    const s = state({ today: "2025-09-28", workers: [worker()], attendance: filled("2025-09-27") }); // Sunday off
    expect(dailyEvents(s)).toEqual([]);
  });
  it("on the 1st, asks to settle last month if it is still open", () => {
    const s = state({ today: "2025-10-01", attendance: [...filled("2025-09-30"), entry("2025-10-01", "present", "household")] });
    expect(dailyEvents(s)).toEqual([{ kind: "monthStart", month: "2025-09" }]);
    const settled = { ...s, settlements: [{ workerId: "e1", month: "2025-09", amountDue: 4000, finalizedAt: "2025-10-01T00:00:00Z" }] };
    expect(dailyEvents(settled)).toEqual([]);
  });
});
