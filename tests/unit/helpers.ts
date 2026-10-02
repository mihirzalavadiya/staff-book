import type { LedgerState } from "@/lib/ledger";
import type { AttendanceEntry, Side, Worker } from "@/lib/types";

/** Saturday 27 Sept 2025: Sundays are 7, 14, 21, 28 → 26 working days for Mon–Sat. */
export const TODAY = "2025-09-27";
export const MONTH = "2025-09";

export function worker(overrides: Partial<Worker> = {}): Worker {
  return {
    id: "e1",
    name: "Sunita",
    gender: "female",
    role: "cook",
    salary: 4000,
    tone: "purple",
    workDays: [1, 2, 3, 4, 5, 6],
    paidLeavesPerMonth: 2,
    phone: "",
    language: "hi",
    startDate: "2025-01-01",
    token: "t1",
    ...overrides,
  };
}

let seq = 0;
export function entry(
  date: string,
  state: AttendanceEntry["state"],
  markedBy: Side,
  extra: Partial<AttendanceEntry> & { time?: string } = {},
): AttendanceEntry {
  const { time = "07:40", ...rest } = extra;
  seq += 1;
  return {
    id: `a${seq}`,
    workerId: "e1",
    date,
    state,
    markedBy,
    at: `${date}T${time}:00+05:30`,
    ...rest,
  };
}

export function state(overrides: Partial<LedgerState> = {}): LedgerState {
  return {
    today: TODAY,
    workers: [worker()],
    attendance: [],
    advances: [],
    settlements: [],
    reminders: [],
    ...overrides,
  };
}

/** Every Mon–Sat date in Sept 2025 up to and including `until`. */
export function workdaysUntil(until: string): string[] {
  const out: string[] = [];
  for (let d = 1; d <= 30; d++) {
    const iso = `2025-09-${String(d).padStart(2, "0")}`;
    if (iso > until) break;
    const dow = new Date(`${iso}T00:00:00`).getDay();
    if (dow !== 0) out.push(iso);
  }
  return out;
}
