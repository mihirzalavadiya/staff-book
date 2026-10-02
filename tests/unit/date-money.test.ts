import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  daysBetween,
  daysInMonth,
  dayShort,
  formatDayMonth,
  formatMonth,
  formatTime,
  monthDates,
  weekOf,
  weekdayOf,
} from "@/lib/date";
import { formatINR } from "@/lib/money";
import { roleName } from "@/lib/roles";

describe("date helpers", () => {
  it("weekday, month length and month dates", () => {
    expect(weekdayOf("2025-09-27")).toBe(6);
    expect(daysInMonth("2025-09")).toBe(30);
    expect(daysInMonth("2024-02")).toBe(29);
    expect(monthDates("2025-09")[0]).toBe("2025-09-01");
    expect(monthDates("2025-09").at(-1)).toBe("2025-09-30");
  });
  it("arithmetic crosses month and year boundaries", () => {
    expect(addDays("2025-09-30", 1)).toBe("2025-10-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addMonths("2025-01", -1)).toBe("2024-12");
    expect(addMonths("2025-12", 1)).toBe("2026-01");
    expect(daysBetween("2025-09-20", "2025-09-27")).toBe(7);
  });
  it("week runs Sunday to Saturday", () => {
    expect(weekOf("2025-09-27")).toEqual(["2025-09-21", "2025-09-22", "2025-09-23", "2025-09-24", "2025-09-25", "2025-09-26", "2025-09-27"]);
  });
  it("formats per language", () => {
    expect(formatDayMonth("2025-09-27", "en")).toBe("27 Sept");
    expect(formatDayMonth("2025-09-27", "hi")).toBe("27 सितंबर");
    expect(formatMonth("2025-09", "en")).toBe("Sept 2025");
    expect(dayShort("hi")[0]).toBe("र");
    expect(formatTime("2025-09-27T08:05:00+05:30")).toMatch(/^\d{1,2}:05 (am|pm)$/);
  });
});

describe("formatINR – Indian grouping", () => {
  it("groups lakhs and crores", () => {
    expect(formatINR(0)).toBe("₹0");
    expect(formatINR(999)).toBe("₹999");
    expect(formatINR(2192)).toBe("₹2,192");
    expect(formatINR(12000)).toBe("₹12,000");
    expect(formatINR(1234567)).toBe("₹12,34,567");
  });
  it("shows a minus sign for deductions and rounds paise", () => {
    expect(formatINR(-308)).toBe("−₹308");
    expect(formatINR(153.85)).toBe("₹154");
  });
});

describe("roleName", () => {
  const t = (k: string) => `T(${k})`;
  it("uses the custom label only for other", () => {
    expect(roleName(t, "cook", "Gardener")).toBe("T(roles.cook)");
    expect(roleName(t, "other", " Gardener ")).toBe("Gardener");
    expect(roleName(t, "other", "")).toBe("T(roles.other)");
  });
});
