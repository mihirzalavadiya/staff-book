import type { Advance, AttendanceEntry, DayState, Reminder, Settlement, Worker } from "./types";
import { daysBetween, monthDates, monthOf, weekdayOf } from "./date";

export const EDIT_WINDOW_DAYS = 7;

export interface LedgerState {
  today: string;
  workers: Worker[];
  attendance: AttendanceEntry[];
  advances: Advance[];
  settlements: Settlement[];
  reminders: Reminder[];
}

export interface DayInfo {
  state: DayState;
  /** Latest entry that produced this state (undefined for off/unknown). */
  entry?: AttendanceEntry;
  /** Open dispute entry, if any. */
  dispute?: AttendanceEntry;
  /** Every entry for this day, oldest first. */
  history: AttendanceEntry[];
}

/** A working day: inside the engagement's dates and on one of its weekdays. */
export function isWorkDay(worker: Worker, date: string): boolean {
  if (date < worker.startDate) return false;
  if (worker.endDate && date > worker.endDate) return false;
  return worker.workDays.includes(weekdayOf(date));
}

function historyFor(state: LedgerState, workerId: string, date: string): AttendanceEntry[] {
  return state.attendance
    .filter((a) => a.workerId === workerId && a.date === date)
    .sort((a, b) => a.at.localeCompare(b.at));
}

/**
 * The single state of a worker's day. Append-only log: the latest entry wins,
 * except an open dispute, which stays visible until the household resolves it.
 */
export function dayInfo(state: LedgerState, worker: Worker, date: string): DayInfo {
  const history = historyFor(state, worker.id, date);
  if (!isWorkDay(worker, date) && history.length === 0) {
    return { state: "off", history };
  }
  if (history.length === 0) {
    return { state: date > state.today ? "off" : "unknown", history };
  }
  const last = history[history.length - 1];
  if (last.state === "dispute") {
    return { state: "dispute", entry: last, dispute: last, history };
  }
  return { state: last.state, entry: last, history };
}

export function canEdit(state: LedgerState, date: string): boolean {
  const diff = daysBetween(date, state.today);
  return diff >= 0 && diff <= EDIT_WINDOW_DAYS;
}

export interface PendingItem {
  worker: Worker;
  date: string;
  info: DayInfo;
  /** Set when the worker tapped "remind them" for this day. */
  reminder?: Reminder;
}

function reminderFor(state: LedgerState, workerId: string, date: string): Reminder | undefined {
  return state.reminders.find((r) => r.workerId === workerId && r.date === date);
}

/** Every unresolved day (claim, dispute, unknown) up to today, newest first. */
export function pendingItems(state: LedgerState, month?: string): PendingItem[] {
  const out: PendingItem[] = [];
  const dates = month ? monthDates(month) : monthDates(monthOf(state.today));
  for (const worker of state.workers) {
    if (worker.endDate) continue;
    for (const date of dates) {
      if (date > state.today) break;
      const info = dayInfo(state, worker, date);
      if (info.state === "claim" || info.state === "dispute" || info.state === "unknown") {
        out.push({ worker, date, info, reminder: reminderFor(state, worker.id, date) });
      }
    }
  }
  // Reminded days first: the worker is waiting on them. Then disputes, claims, unknowns, newest first.
  const rank: Record<string, number> = { dispute: 1, claim: 2, unknown: 3 };
  const key = (p: PendingItem) => (p.reminder ? 0 : rank[p.info.state]);
  return out.sort((a, b) => key(a) - key(b) || b.date.localeCompare(a.date));
}

export interface TodayProgress {
  total: number;
  filled: number;
  claims: number;
  unknown: number;
}

export function todayProgress(state: LedgerState): TodayProgress {
  let total = 0;
  let filled = 0;
  let claims = 0;
  let unknown = 0;
  for (const worker of state.workers) {
    if (worker.endDate) continue;
    const info = dayInfo(state, worker, state.today);
    if (info.state === "off") continue;
    total += 1;
    if (info.state === "present" || info.state === "leave") filled += 1;
    if (info.state === "claim") claims += 1;
    if (info.state === "unknown") unknown += 1;
  }
  return { total, filled, claims, unknown };
}

export interface MonthSummary {
  month: string;
  workingDays: number;
  present: number;
  leave: number;
  paidLeaveUsed: number;
  unpaidLeave: number;
  perDay: number;
  deduction: number;
  advances: Advance[];
  advanceTotal: number;
  amountDue: number;
  pending: PendingItem[];
  settlement?: Settlement;
}

export function monthSummary(state: LedgerState, worker: Worker, month: string): MonthSummary {
  const dates = monthDates(month);
  let workingDays = 0;
  let present = 0;
  let leave = 0;
  const pending: PendingItem[] = [];
  for (const date of dates) {
    const info = dayInfo(state, worker, date);
    if (info.state === "off" && !isWorkDay(worker, date)) continue;
    if (isWorkDay(worker, date)) workingDays += 1;
    if (info.state === "present") present += 1;
    else if (info.state === "leave") leave += 1;
    else if (
      date <= state.today &&
      (info.state === "claim" || info.state === "dispute" || info.state === "unknown")
    ) {
      pending.push({ worker, date, info, reminder: reminderFor(state, worker.id, date) });
    }
  }
  const paidLeaveUsed = Math.min(leave, worker.paidLeavesPerMonth);
  const unpaidLeave = Math.max(0, leave - worker.paidLeavesPerMonth);
  // Day rate uses the full month's schedule, so a worker who joined mid-month is not over-deducted.
  const scheduleDays = dates.filter((d) => worker.workDays.includes(weekdayOf(d))).length;
  const perDay = scheduleDays > 0 ? worker.salary / scheduleDays : 0;
  const deduction = Math.round(unpaidLeave * perDay);
  const advances = state.advances.filter((a) => a.workerId === worker.id && monthOf(a.date) === month);
  const advanceTotal = advances.reduce((s, a) => s + a.amount, 0);
  const amountDue = worker.salary - deduction - advanceTotal;
  const settlement = state.settlements.find((s) => s.workerId === worker.id && s.month === month);
  return {
    month,
    workingDays,
    present,
    leave,
    paidLeaveUsed,
    unpaidLeave,
    perDay,
    deduction,
    advances,
    advanceTotal,
    amountDue,
    pending,
    settlement,
  };
}

export function pastSettlements(state: LedgerState, workerId: string, before: string): Settlement[] {
  return state.settlements
    .filter((s) => s.workerId === workerId && s.month < before)
    .sort((a, b) => b.month.localeCompare(a.month));
}

export function attendancePercent(state: LedgerState, worker: Worker): number {
  let work = 0;
  let present = 0;
  for (const a of state.attendance) {
    if (a.workerId !== worker.id) continue;
    work += 1;
    if (a.state === "present") present += 1;
  }
  return work === 0 ? 0 : Math.round((present / work) * 100);
}
