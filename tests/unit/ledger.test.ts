import { describe, expect, it } from "vitest";
import {
  attendancePercent,
  canEdit,
  dayInfo,
  isWorkDay,
  monthSummary,
  pendingItems,
  todayProgress,
} from "@/lib/ledger";
import { MONTH, TODAY, entry, state, worker, workdaysUntil } from "./helpers";

describe("isWorkDay", () => {
  const w = worker();
  it("follows the weekday schedule", () => {
    expect(isWorkDay(w, "2025-09-22")).toBe(true); // Monday
    expect(isWorkDay(w, "2025-09-21")).toBe(false); // Sunday
  });
  it("is off before the start date and after the end date", () => {
    const mid = worker({ startDate: "2025-09-15", endDate: "2025-09-20" });
    expect(isWorkDay(mid, "2025-09-12")).toBe(false);
    expect(isWorkDay(mid, "2025-09-15")).toBe(true);
    expect(isWorkDay(mid, "2025-09-22")).toBe(false);
  });
});

describe("dayInfo – the app never guesses", () => {
  it("is unknown when nobody marked a working day", () => {
    expect(dayInfo(state(), worker(), "2025-09-26").state).toBe("unknown");
  });
  it("is off on a non-working day with no entries", () => {
    expect(dayInfo(state(), worker(), "2025-09-21").state).toBe("off");
  });
  it("is off (not unknown) for future working days", () => {
    expect(dayInfo(state(), worker(), "2025-09-29").state).toBe("off");
  });
  it("latest row wins (append-only log)", () => {
    const s = state({
      attendance: [
        entry("2025-09-24", "claim", "worker", { time: "07:58" }),
        entry("2025-09-24", "present", "household", { time: "09:00" }),
      ],
    });
    const info = dayInfo(s, worker(), "2025-09-24");
    expect(info.state).toBe("present");
    expect(info.history).toHaveLength(2);
  });
  it("keeps an open dispute visible", () => {
    const s = state({
      attendance: [
        entry("2025-09-25", "leave", "household", { time: "21:05" }),
        entry("2025-09-25", "dispute", "worker", { time: "21:40", voiceSeconds: 14 }),
      ],
    });
    const info = dayInfo(s, worker(), "2025-09-25");
    expect(info.state).toBe("dispute");
    expect(info.dispute?.voiceSeconds).toBe(14);
  });
  it("a worker leave on a Sunday still counts (entries beat the schedule)", () => {
    const s = state({ attendance: [entry("2025-09-21", "leave", "worker")] });
    expect(dayInfo(s, worker(), "2025-09-21").state).toBe("leave");
  });
});

describe("canEdit – 7-day window", () => {
  it("allows today and the last seven days", () => {
    expect(canEdit(state(), TODAY)).toBe(true);
    expect(canEdit(state(), "2025-09-20")).toBe(true);
  });
  it("blocks older days and the future", () => {
    expect(canEdit(state(), "2025-09-19")).toBe(false);
    expect(canEdit(state(), "2025-09-28")).toBe(false);
  });
});

describe("pendingItems", () => {
  it("lists unknown, claim and dispute days up to today, reminders first then disputes", () => {
    const s = state({
      attendance: [
        ...workdaysUntil("2025-09-26")
          .filter((d) => !["2025-09-17", "2025-09-24", "2025-09-25"].includes(d))
          .map((d) => entry(d, "present", "household")),
        entry("2025-09-24", "claim", "worker"),
        entry("2025-09-25", "leave", "household"),
        entry("2025-09-25", "dispute", "worker"),
      ],
      reminders: [{ workerId: "e1", date: "2025-09-17", at: "2025-09-26T19:00:00+05:30" }],
    });
    const items = pendingItems(s);
    expect(items.map((i) => `${i.date}:${i.info.state}`)).toEqual([
      "2025-09-17:unknown", // reminded → first
      "2025-09-25:dispute",
      "2025-09-24:claim",
      "2025-09-27:unknown", // today, nobody marked
    ]);
    expect(items[0].reminder).toBeDefined();
  });
  it("skips archived workers and days before the start date", () => {
    const s = state({
      workers: [worker({ startDate: "2025-09-26" }), worker({ id: "e2", endDate: "2025-09-01" })],
    });
    const items = pendingItems(s);
    expect(items.every((i) => i.worker.id === "e1")).toBe(true);
    expect(items.map((i) => i.date)).toEqual(["2025-09-27", "2025-09-26"]);
  });
});

describe("todayProgress", () => {
  it("counts filled, claims and unknown for workers who work today", () => {
    const s = state({
      workers: [worker(), worker({ id: "e2" }), worker({ id: "e3" }), worker({ id: "e4", workDays: [0] })],
      attendance: [
        entry(TODAY, "present", "household"),
        { ...entry(TODAY, "claim", "worker"), workerId: "e2" },
      ],
    });
    expect(todayProgress(s)).toEqual({ total: 3, filled: 1, claims: 1, unknown: 1 });
  });
});

describe("monthSummary – the design's numbers", () => {
  it("26 working days, 22 present, 4 leave (2 free, 2 unpaid), ₹154/day, −₹308, −₹1,500 advance → ₹2,192", () => {
    const leaves = ["2025-09-09", "2025-09-10", "2025-09-29", "2025-09-30"];
    const s = state({
      today: "2025-09-30",
      attendance: [
        ...workdaysUntil("2025-09-30")
          .filter((d) => !leaves.includes(d))
          .map((d) => entry(d, "present", "household")),
        ...leaves.map((d) => entry(d, "leave", "worker")),
      ],
      advances: [
        { id: "x", workerId: "e1", amount: 500, date: "2025-09-05" },
        { id: "y", workerId: "e1", amount: 1000, date: "2025-09-18" },
      ],
    });
    const m = monthSummary(s, worker(), MONTH);
    expect(m.workingDays).toBe(26);
    expect(m.present).toBe(22);
    expect(m.leave).toBe(4);
    expect(m.paidLeaveUsed).toBe(2);
    expect(m.unpaidLeave).toBe(2);
    expect(Math.round(m.perDay)).toBe(154);
    expect(m.deduction).toBe(308);
    expect(m.advanceTotal).toBe(1500);
    expect(m.amountDue).toBe(2192);
    expect(m.pending).toEqual([]);
  });

  it("is blocked while any day is unknown, claimed or disputed", () => {
    const s = state({
      attendance: [
        ...workdaysUntil("2025-09-26")
          .filter((d) => d !== "2025-09-17" && d !== "2025-09-24")
          .map((d) => entry(d, "present", "household")),
        entry("2025-09-24", "claim", "worker"),
      ],
    });
    const m = monthSummary(s, worker(), MONTH);
    expect(m.pending.map((p) => `${p.date}:${p.info.state}`)).toEqual([
      "2025-09-17:unknown",
      "2025-09-24:claim",
      "2025-09-27:unknown",
    ]);
  });

  it("does not over-deduct a worker who joined mid-month (rate uses the full schedule)", () => {
    const w = worker({ startDate: "2025-09-22", paidLeavesPerMonth: 0 });
    const s = state({
      attendance: [
        ...["2025-09-22", "2025-09-23", "2025-09-24", "2025-09-25", "2025-09-26"].map((d) => entry(d, "present", "household")),
        entry("2025-09-27", "leave", "worker"),
      ],
    });
    const m = monthSummary(s, w, MONTH);
    expect(m.workingDays).toBe(8); // Mon–Sat from 22 to 30 Sept
    expect(m.unpaidLeave).toBe(1);
    expect(m.deduction).toBe(154); // 4000 / 26, not 4000 / 6
    expect(m.pending).toEqual([]);
  });

  it("returns the settlement once finalized", () => {
    const s = state({ settlements: [{ workerId: "e1", month: MONTH, amountDue: 2192, finalizedAt: "2025-10-01T10:00:00Z" }] });
    expect(monthSummary(s, worker(), MONTH).settlement?.amountDue).toBe(2192);
  });
});

describe("attendancePercent", () => {
  it("is present rows over all rows", () => {
    const s = state({
      attendance: [
        entry("2025-09-22", "present", "household"),
        entry("2025-09-23", "present", "household"),
        entry("2025-09-24", "present", "household"),
        entry("2025-09-25", "leave", "worker"),
      ],
    });
    expect(attendancePercent(s, worker())).toBe(75);
    expect(attendancePercent(state(), worker())).toBe(0);
  });
});
